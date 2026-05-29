import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { deleteFromS3, getFromS3, s3KeyFromUrl, uploadToS3 } from '../utils/s3.js';
import slugify from 'slugify';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler, ApiError } from '../utils/apiError.js';
import {
  ChecklistTemplate,
  ClientProfile,
  Conversation,
  DirectMessage,
  Discount,
  DesignerProfile,
  Dispute,
  Notification,
  Portfolio,
  PremiumPlan,
  Project,
  ProjectComment,
  Review,
  SavedBankAccount,
  Subscription,
  Transaction,
  User,
  Wallet,
  Withdrawal
} from '../models/index.js';
import { approveMilestone, completeProject, fundEscrow, getOwnedProject, refundProject, requestRevision } from '../services/projectService.js';
import { validateDiscount } from '../services/discountService.js';
import { createPayosEscrowPayment, createPayosPremiumPayment, createPayosWalletTopup, handlePayosPaymentWebhook, payPremiumWithWallet, syncPayosPayment } from '../services/paymentService.js';
import { handleCassoWithdrawalWebhook, requestCassoWithdrawal, requestPayosWithdrawal, syncPayosWithdrawal } from '../services/withdrawalService.js';
import { confirmPayosWebhook, getPayosPayoutBalance } from '../services/payosService.js';
import { transferWalletToDesigner } from '../services/walletService.js';
import { addSSEClient } from '../services/notificationService.js';

export const mainRoutes = Router();
const projectFileSizeLimit = 100 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: projectFileSizeLimit } });

const pageParams = (req) => ({ page: Math.max(Number(req.query.page || 1), 1), limit: Math.min(Number(req.query.limit || 12), 50) });
const premiumAccountTypeForRole = (role) => (role === 'designer' ? 'designer_premium' : 'business_premium');
const listQuery = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

function messagePreview(content, attachments = []) {
  const value = String(content || '').trim();
  if (value) return value.slice(0, 180);
  return attachments.length ? 'Da gui tep dinh kem' : '';
}

function fileKey(file = {}) {
  return file.key || s3KeyFromUrl(file.url);
}

async function deleteProjectFiles(files = []) {
  await Promise.all((files || [])
    .map(fileKey)
    .filter(Boolean)
    .filter((key) => key.startsWith('files/'))
    .map((key) => deleteFromS3(key).catch(() => null)));
}

function projectHasFileKey(project, key) {
  if (!key) return false;
  const finalFiles = project.finalFiles || [];
  const milestoneFiles = (project.milestones || []).flatMap((milestone) => milestone.submittedFiles || []);
  return [...finalFiles, ...milestoneFiles].some((file) => fileKey(file) === key);
}

async function getConversationForUser(user, id) {
  if (!objectIdPattern.test(String(id))) throw new ApiError(400, 'Cuoc tro chuyen khong hop le');
  const conversation = await Conversation.findOne({ _id: id, participants: user._id });
  if (!conversation) throw new ApiError(404, 'Khong tim thay cuoc tro chuyen');
  return conversation;
}

function inboxPathFor(user, conversationId) {
  return user.roles?.includes('designer') ? `/designer/messages/${conversationId}` : `/client/messages/${conversationId}`;
}

mainRoutes.post('/payments/payos/webhook', asyncHandler(async (req, res) => {
  res.json(await handlePayosPaymentWebhook(req.body));
}));

mainRoutes.post('/withdrawals/casso/webhook', asyncHandler(async (req, res) => {
  res.json(await handleCassoWithdrawalWebhook({
    body: req.body,
    signature: req.get('X-Casso-Signature'),
    secureToken: req.get('secure-token')
  }));
}));

mainRoutes.get('/stats/public', asyncHandler(async (_req, res) => {
  const [freelancers, clients, activeProjects, ratingStats] = await Promise.all([
    DesignerProfile.countDocuments(),
    ClientProfile.countDocuments(),
    Project.countDocuments({ status: { $nin: ['draft', 'completed', 'cancelled'] } }),
    DesignerProfile.aggregate([{ $group: { _id: null, average: { $avg: '$ratingAverage' } } }])
  ]);
  res.json({
    freelancers,
    clients,
    activeProjects,
    averageRating: Number((ratingStats[0]?.average || 0).toFixed(2))
  });
}));

mainRoutes.get('/users/me', requireAuth, asyncHandler(async (req, res) => {
  const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
  const designerProfile = await DesignerProfile.findOne({ userId: req.user._id });
  res.json({ user: req.user, clientProfile, designerProfile });
}));

mainRoutes.get('/dashboard/summary', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.roles.includes('admin')) {
    const [users, activeProjects, disputes, revenue] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments({ status: { $nin: ['draft', 'completed', 'cancelled'] } }),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      Transaction.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$platformFee' } } }])
    ]);
    return res.json({ users, activeProjects, disputes, revenue: revenue[0]?.total || 0 });
  }

  const projectQuery = req.user.roles.includes('designer') ? { designerId: req.user._id } : { clientId: req.user._id };
  const [projects, wallet, designerProfile] = await Promise.all([
    Project.find(projectQuery).select('status budget agreement'),
    Wallet.findOne({ userId: req.user._id }),
    DesignerProfile.findOne({ userId: req.user._id })
  ]);
  res.json({
    activeProjects: projects.filter((project) => !['completed', 'cancelled'].includes(project.status)).length,
    pendingApprovals: projects.filter((project) => project.status === 'submitted').length,
    newRequests: projects.filter((project) => project.status === 'pending_designer').length,
    totalSpent: wallet?.totalSpent || 0,
    totalEarned: wallet?.totalEarned || 0,
    pendingPayouts: wallet?.pendingBalance || 0,
    profileViews: designerProfile?.profileViews || 0
  });
}));

mainRoutes.patch('/users/me', requireAuth, asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'avatar', 'dateOfBirth', 'notificationPreferences'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (patch.email && patch.email !== req.user.email) {
    const exists = await User.findOne({ email: String(patch.email).toLowerCase().trim(), _id: { $ne: req.user._id } });
    if (exists) throw new ApiError(409, 'Email da duoc su dung');
    patch.emailVerified = false;
  }
  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true }).select('-passwordHash');
  res.json(user);
}));

mainRoutes.get('/users/me/notification-preferences', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences').lean();
  const defaults = {
    email: { project: false, wallet: false, dispute: true, verification: true, premium: true, system: false },
    inApp: { project: true, wallet: true, dispute: true, verification: true, premium: true, system: true },
    emailDigest: 'instant'
  };
  res.json({ preferences: { ...defaults, ...user?.notificationPreferences } });
}));

mainRoutes.patch('/users/me/notification-preferences', requireAuth, asyncHandler(async (req, res) => {
  const { email, inApp, emailDigest } = req.body;
  const update = {};
  if (email && typeof email === 'object') {
    for (const [cat, val] of Object.entries(email)) {
      update[`notificationPreferences.email.${cat}`] = Boolean(val);
    }
  }
  if (inApp && typeof inApp === 'object') {
    for (const [cat, val] of Object.entries(inApp)) {
      update[`notificationPreferences.inApp.${cat}`] = Boolean(val);
    }
  }
  if (emailDigest && ['instant', 'daily', 'weekly', 'off'].includes(emailDigest)) {
    update['notificationPreferences.emailDigest'] = emailDigest;
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('notificationPreferences');
  res.json({ preferences: user.notificationPreferences });
}));


mainRoutes.patch('/users/me/password', requireAuth, asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  if (newPassword.length < 8) throw new ApiError(400, 'Mat khau moi toi thieu 8 ky tu');
  const user = await User.findById(req.user._id).select('+passwordHash');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Mat khau hien tai khong dung');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Da doi mat khau' });
}));

mainRoutes.patch('/clients/profile', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const allowed = ['companyName', 'businessType', 'address', 'taxCode', 'billingInfo'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const profile = await ClientProfile.findOneAndUpdate({ userId: req.user._id }, { ...patch, userId: req.user._id }, { upsert: true, new: true });
  res.json(profile);
}));

mainRoutes.get('/designers', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req);
  const query = {};
  const categories = listQuery(req.query.category);
  const tags = listQuery(req.query.tags);
  const experience = listQuery(req.query.experience);
  if (categories.length) query.categories = { $in: categories };
  if (req.query.verified === 'true') query.verificationStatus = 'verified';
  if (req.query.style) query.styleTags = req.query.style;
  if (tags.length) query.styleTags = { $in: tags };
  if (req.query.rating) query.ratingAverage = { $gte: Number(req.query.rating) };
  if (req.query.minPrice || req.query.maxPrice) {
    query.startingPrice = {};
    if (req.query.minPrice) query.startingPrice.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.startingPrice.$lte = Number(req.query.maxPrice);
  }
  if (req.query.dateRange && req.query.dateRange !== 'all') {
    const days = Number(req.query.dateRange);
    if (Number.isFinite(days) && days > 0) query.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
  }
  if (experience.length) {
    const experienceRegex = [];
    if (experience.includes('beginner')) experienceRegex.push(/^[1-2]\s/);
    if (experience.includes('intermediate')) experienceRegex.push(/^[3-5]\s/);
    if (experience.includes('expert')) experienceRegex.push(/^[6-9]\s/);
    if (experienceRegex.length) query.experience = { $in: experienceRegex };
  }
  if (req.query.q) query.$text = { $search: req.query.q };
  const sortMap = {
    rating: { premiumStatus: -1, ratingAverage: -1 },
    price: { startingPrice: 1 },
    newest: { createdAt: -1 },
    popularity: { premiumStatus: -1, profileViews: -1 }
  };
  const sort = sortMap[req.query.sort] || { premiumStatus: -1, ratingAverage: -1, completedProjects: -1 };
  const [items, total, categoryFacets] = await Promise.all([
    DesignerProfile.find(query).populate('userId', 'name avatar').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    DesignerProfile.countDocuments(query),
    DesignerProfile.aggregate([{ $unwind: '$categories' }, { $group: { _id: '$categories', count: { $sum: 1 } } }])
  ]);
  res.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    facets: { categories: Object.fromEntries(categoryFacets.map((item) => [item._id, item.count])) }
  });
}));

mainRoutes.get('/designers/:idOrSlug', asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const query = key.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: key }, { userId: key }] } : { slug: key };
  const profile = await DesignerProfile.findOneAndUpdate(query, { $inc: { profileViews: 1 } }, { new: true }).populate('userId', 'name avatar email');
  if (!profile) throw new ApiError(404, 'Khong tim thay designer');
  const [portfolio, reviews] = await Promise.all([
    Portfolio.find({ designerId: profile.userId._id }).limit(12),
    Review.find({ revieweeId: profile.userId._id, status: 'visible' }).populate('reviewerId', 'name avatar').limit(10)
  ]);
  res.json({ profile, portfolio, reviews });
}));

mainRoutes.post('/designers/profile', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const slug = slugify(`${req.body.title || req.user.name}-${req.user._id.toString().slice(-5)}`, { lower: true, strict: true });
  const profile = await DesignerProfile.findOneAndUpdate({ userId: req.user._id }, { ...req.body, userId: req.user._id, slug }, { upsert: true, new: true });
  res.status(201).json(profile);
}));
mainRoutes.patch('/designers/profile', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => res.json(await DesignerProfile.findOneAndUpdate({ userId: req.user._id }, req.body, { new: true }))));
mainRoutes.post('/designers/verification', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => res.json(await DesignerProfile.findOneAndUpdate({ userId: req.user._id }, { verificationStatus: 'pending', verificationNote: req.body.note }, { new: true }))));

mainRoutes.post('/portfolio', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => res.status(201).json(await Portfolio.create({ ...req.body, designerId: req.user._id }))));
mainRoutes.get('/portfolio/designer/:designerId', asyncHandler(async (req, res) => res.json(await Portfolio.find({ designerId: req.params.designerId }))));
mainRoutes.patch('/portfolio/:id', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const item = await Portfolio.findOneAndUpdate({ _id: req.params.id, designerId: req.user._id }, req.body, { new: true });
  if (!item) throw new ApiError(404, 'Khong tim thay portfolio');
  res.json(item);
}));
mainRoutes.delete('/portfolio/:id', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  await Portfolio.deleteOne({ _id: req.params.id, designerId: req.user._id });
  res.json({ message: 'Da xoa portfolio' });
}));

mainRoutes.post('/projects', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
  const priorityLevel = clientProfile?.accountType === 'business_premium' && clientProfile?.premiumStatus === 'premium' ? 'premium' : 'standard';
  const project = await Project.create({ ...req.body, clientId: req.user._id, priorityLevel, status: 'pending_designer' });
  res.status(201).json(project);
}));
mainRoutes.get('/projects/open', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const { q = '', category = '', budget = '', urgent = '', sort = 'match' } = req.query;
  const designerProfile = await DesignerProfile.findOne({ userId: req.user._id }).lean();
  const query = {
    $and: [{ $or: [{ designerId: { $exists: false } }, { designerId: null }] }],
    status: 'pending_designer'
  };
  if (category) query.category = category;
  if (urgent === 'true') query.urgent = true;
  if (budget) query['budget.max'] = { $lte: Number(budget) };
  if (q) {
    const regex = new RegExp(String(q).trim(), 'i');
    query.$and.push({ $or: [{ title: regex }, { description: regex }, { category: regex }, { stylePreferences: regex }, { deliverables: regex }] });
  }

  const projects = await Project.find(query)
    .populate('clientId', 'name avatar email')
    .sort({ priorityLevel: -1, createdAt: -1 })
    .limit(80)
    .lean();

  const profileTerms = new Set([
    ...(designerProfile?.categories || []),
    ...(designerProfile?.skills || []),
    ...(designerProfile?.styleTags || [])
  ].map((value) => String(value).toLowerCase()));

  const items = projects.map((project) => {
    const terms = [
      project.category,
      ...(project.stylePreferences || []),
      ...(project.deliverables || []),
      project.preferredDesignerLevel
    ].filter(Boolean).map((value) => String(value).toLowerCase());
    const matchedTerms = terms.filter((term) => profileTerms.has(term));
    const matchScore = Math.min(98, 56 + matchedTerms.length * 12 + (project.priorityLevel === 'premium' ? 6 : 0) + (project.urgent ? 4 : 0));
    return { ...project, matchScore, matchedTerms: [...new Set(matchedTerms)] };
  });

  items.sort((a, b) => {
    if (sort === 'budget') return (b.budget?.max || 0) - (a.budget?.max || 0);
    if (sort === 'deadline') return new Date(a.deadline || 8640000000000000) - new Date(b.deadline || 8640000000000000);
    return b.matchScore - a.matchScore || new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({ items, designerProfile });
}));
mainRoutes.get('/projects/my', requireAuth, asyncHandler(async (req, res) => {
  const query = req.user.roles.includes('admin') ? {} : req.user.roles.includes('designer') ? { designerId: req.user._id } : { clientId: req.user._id };
  res.json(await Project.find(query).populate('clientId designerId', 'name avatar email').sort({ updatedAt: -1 }));
}));
mainRoutes.get('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  await project.populate('clientId designerId', 'name avatar email');
  const comments = await ProjectComment.find({ projectId: project._id }).populate('senderId', 'name avatar').sort({ createdAt: 1 });
  res.json({ project, comments });
}));
mainRoutes.patch('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  Object.assign(project, req.body);
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/invite', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  project.designerId = req.body.designerId;
  project.status = 'pending_designer';
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/accept', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  if (String(project.designerId) !== String(req.user._id)) throw new ApiError(403, 'Khong phai designer duoc moi');
  project.status = 'agreement_pending';
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/claim', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, status: 'pending_designer', $or: [{ designerId: { $exists: false } }, { designerId: null }] });
  if (!project) throw new ApiError(404, 'Du an khong con mo hoac da co designer nhan');
  project.designerId = req.user._id;
  project.status = 'agreement_pending';
  await project.save();
  res.json(await project.populate('clientId designerId', 'name avatar email'));
}));
mainRoutes.post('/projects/:id/reject', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  project.status = 'cancelled';
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/agreement', requireAuth, asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  project.agreement = { ...req.body, confirmedAt: new Date() };
  project.budget.agreed = req.body.price;
  project.milestones = req.body.milestones || project.milestones;
  project.status = 'payment_pending';
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/start', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  if (String(project.designerId) !== String(req.user._id)) throw new ApiError(403, 'Khong phai designer cua du an');
  if (!['escrow_funded', 'revision_requested'].includes(project.status)) throw new ApiError(400, 'Du an chua san sang de bat dau');
  project.status = 'in_progress';
  await project.save();
  await ProjectComment.create({ projectId: project._id, senderId: req.user._id, content: req.body.content || 'Designer da bat dau thuc hien du an', type: 'system' });
  res.json(project);
}));
mainRoutes.post('/projects/:id/comments', requireAuth, asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  const comment = await ProjectComment.create({ projectId: project._id, senderId: req.user._id, content: req.body.content, attachments: req.body.attachments || [], type: req.body.type || 'message' });
  res.status(201).json(comment);
}));
mainRoutes.post('/projects/:id/milestones/:milestoneId/submit', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  const milestone = project.milestones.id(req.params.milestoneId);
  if (!milestone) throw new ApiError(404, 'Khong tim thay milestone');
  await deleteProjectFiles(milestone.submittedFiles);
  milestone.status = 'submitted';
  milestone.submittedFiles = req.body.files || [];
  project.status = 'submitted';
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/final-files', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  if (String(project.designerId) !== String(req.user._id)) throw new ApiError(403, 'Khong phai designer cua du an');
  await deleteProjectFiles(project.finalFiles);
  project.finalFiles = req.body.files || [];
  project.status = 'final_submitted';
  await project.save();
  await ProjectComment.create({ projectId: project._id, senderId: req.user._id, content: req.body.note || 'Designer da ban giao file cuoi', attachments: req.body.files || [], type: 'system' });
  res.json(project);
}));
mainRoutes.post('/projects/:id/milestones/:milestoneId/approve', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await approveMilestone({ project: await getOwnedProject(req.user, req.params.id), milestoneId: req.params.milestoneId, userId: req.user._id }))));
mainRoutes.post('/projects/:id/revision', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await requestRevision({ project: await getOwnedProject(req.user, req.params.id), userId: req.user._id, content: req.body.content }))));
mainRoutes.post('/projects/:id/complete', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await completeProject({
  project: await getOwnedProject(req.user, req.params.id),
  userId: req.user._id,
  allowMissingFiles: req.body.allowMissingFiles === true
}))));

mainRoutes.post('/payments/escrow', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  if (req.body.paymentMethod === 'payos') {
    return res.json(await createPayosEscrowPayment({
      projectId: req.body.projectId,
      user: req.user,
      discountCode: req.body.discountCode,
      returnUrl: req.body.returnUrl,
      cancelUrl: req.body.cancelUrl
    }));
  }
  return res.json(await fundEscrow({ projectId: req.body.projectId, userId: req.user._id, paymentMethod: req.body.paymentMethod, discountCode: req.body.discountCode }));
}));
mainRoutes.post('/payments/mock-success', requireAuth, asyncHandler(async (_req, res) => res.json({ status: 'success' })));
mainRoutes.post('/payments/payos/:orderCode/sync', requireAuth, asyncHandler(async (req, res) => res.json(await syncPayosPayment({ orderCode: req.params.orderCode, user: req.user }))));
mainRoutes.post('/payments/release', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await approveMilestone({ project: await Project.findById(req.body.projectId), milestoneId: req.body.milestoneId, userId: req.body.clientId }))));
mainRoutes.post('/payments/refund', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await refundProject({ projectId: req.body.projectId, adminId: req.user._id, amount: req.body.amount }))));
mainRoutes.get('/transactions/my', requireAuth, asyncHandler(async (req, res) => res.json(await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 }))));
mainRoutes.get('/wallet/my', requireAuth, asyncHandler(async (req, res) => res.json(await Wallet.findOne({ userId: req.user._id }))));
mainRoutes.post('/wallet/topup', requireAuth, asyncHandler(async (req, res) => res.status(201).json(await createPayosWalletTopup({ user: req.user, amount: req.body.amount, returnUrl: req.body.returnUrl, cancelUrl: req.body.cancelUrl }))));
mainRoutes.post('/wallet/transfers/designer', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.status(201).json(await transferWalletToDesigner({ sender: req.user, designerId: req.body.designerId, projectId: req.body.projectId, amount: req.body.amount, note: req.body.note }))));
mainRoutes.get('/bank-accounts/my', requireAuth, asyncHandler(async (req, res) => res.json(await SavedBankAccount.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 }))));
mainRoutes.post('/bank-accounts', requireAuth, asyncHandler(async (req, res) => {
  if (req.body.isDefault) await SavedBankAccount.updateMany({ userId: req.user._id, isDefault: true }, { isDefault: false });
  const account = await SavedBankAccount.create({
    userId: req.user._id,
    label: req.body.label,
    bankName: req.body.bankName,
    bankBin: req.body.bankBin,
    accountNumber: req.body.accountNumber,
    accountName: req.body.accountName,
    qrImage: req.body.qrImage,
    isDefault: Boolean(req.body.isDefault)
  });
  res.status(201).json(account);
}));
mainRoutes.patch('/bank-accounts/:id', requireAuth, asyncHandler(async (req, res) => {
  if (req.body.isDefault) await SavedBankAccount.updateMany({ userId: req.user._id, isDefault: true, _id: { $ne: req.params.id } }, { isDefault: false });
  const account = await SavedBankAccount.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
  if (!account) throw new ApiError(404, 'Khong tim thay tai khoan ngan hang');
  res.json(account);
}));
mainRoutes.delete('/bank-accounts/:id', requireAuth, asyncHandler(async (req, res) => {
  await SavedBankAccount.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Da xoa tai khoan ngan hang' });
}));
mainRoutes.get('/withdrawals/my', requireAuth, asyncHandler(async (req, res) => res.json(await Withdrawal.find({ $or: [{ userId: req.user._id }, { designerId: req.user._id }] }).sort({ createdAt: -1 }))));
mainRoutes.post('/withdrawals', requireAuth, asyncHandler(async (req, res) => {
  if (req.body.method === 'payos') {
    return res.status(201).json(await requestPayosWithdrawal({ userId: req.user._id, amount: req.body.amount, accountInfo: req.body.accountInfo }));
  }
  return res.status(201).json(await requestCassoWithdrawal({ userId: req.user._id, amount: req.body.amount, accountInfo: req.body.accountInfo }));
}));
mainRoutes.post('/withdrawals/:id/sync', requireAuth, asyncHandler(async (req, res) => res.json(await syncPayosWithdrawal({ withdrawalId: req.params.id, user: req.user }))));

mainRoutes.post('/reviews', requireAuth, asyncHandler(async (req, res) => {
  const review = await Review.create({ ...req.body, reviewerId: req.user._id });
  const stats = await Review.aggregate([{ $match: { revieweeId: review.revieweeId, status: 'visible' } }, { $group: { _id: '$revieweeId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  if (stats[0]) await DesignerProfile.findOneAndUpdate({ userId: review.revieweeId }, { ratingAverage: stats[0].avg, ratingCount: stats[0].count });
  res.status(201).json(review);
}));
mainRoutes.get('/reviews/designer/:designerId', asyncHandler(async (req, res) => res.json(await Review.find({ revieweeId: req.params.designerId, status: 'visible' }).populate('reviewerId', 'name avatar'))));

mainRoutes.get('/conversations/my', requireAuth, asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .populate('clientId designerId', 'name email avatar roles')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();
  res.json(conversations);
}));

mainRoutes.post('/conversations/direct', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const designerId = String(req.body.designerId || '');
  const content = String(req.body.content || '').trim();
  if (!objectIdPattern.test(designerId)) throw new ApiError(400, 'Designer khong hop le');
  if (String(req.user._id) === designerId) throw new ApiError(400, 'Khong the tu nhan tin cho chinh minh');

  const designerProfile = await DesignerProfile.findOne({ userId: designerId }).populate('userId', 'name email avatar roles');
  if (!designerProfile?.userId) throw new ApiError(404, 'Khong tim thay designer');

  const conversation = await Conversation.findOneAndUpdate(
    { clientId: req.user._id, designerId },
    {
      $setOnInsert: {
        clientId: req.user._id,
        designerId,
        participants: [req.user._id, designerId]
      }
    },
    { upsert: true, new: true }
  );

  let message = null;
  if (content) {
    message = await DirectMessage.create({ conversationId: conversation._id, senderId: req.user._id, content });
    conversation.lastMessage = messagePreview(content);
    conversation.lastMessageAt = message.createdAt;
    conversation.unreadBy = [designerId];
    await conversation.save();
    await Notification.create({
      userId: designerId,
      type: 'message.direct',
      category: 'system',
      title: `${req.user.name} da nhan tin cho ban`,
      message: conversation.lastMessage,
      actionUrl: inboxPathFor(designerProfile.userId, conversation._id)
    });
  }

  await conversation.populate('clientId designerId', 'name email avatar roles');
  res.status(message ? 201 : 200).json({ conversation, message });
}));

mainRoutes.get('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const conversation = await getConversationForUser(req.user, req.params.id);
  await conversation.populate('clientId designerId', 'name email avatar roles');
  const messages = await DirectMessage.find({ conversationId: conversation._id })
    .populate('senderId', 'name avatar roles')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ conversation, messages });
}));

mainRoutes.post('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const conversation = await getConversationForUser(req.user, req.params.id);
  const content = String(req.body.content || '').trim();
  const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
  if (!content && !attachments.length) throw new ApiError(400, 'Tin nhan khong duoc de trong');

  const message = await DirectMessage.create({
    conversationId: conversation._id,
    senderId: req.user._id,
    content,
    attachments
  });
  const recipients = conversation.participants.filter((participant) => String(participant) !== String(req.user._id));
  conversation.lastMessage = messagePreview(content, attachments);
  conversation.lastMessageAt = message.createdAt;
  conversation.unreadBy = recipients;
  await conversation.save();

  const recipientUsers = await User.find({ _id: { $in: recipients } }).select('name roles');
  await Notification.insertMany(recipientUsers.map((recipient) => ({
    userId: recipient._id,
    type: 'message.direct',
    category: 'system',
    title: `${req.user.name} da gui tin nhan moi`,
    message: conversation.lastMessage,
    actionUrl: inboxPathFor(recipient, conversation._id)
  })));

  res.status(201).json(await message.populate('senderId', 'name avatar roles'));
}));

mainRoutes.patch('/conversations/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const conversation = await getConversationForUser(req.user, req.params.id);
  await Conversation.updateOne({ _id: conversation._id }, { $pull: { unreadBy: req.user._id } });
  res.json({ success: true });
}));

mainRoutes.post('/disputes', requireAuth, asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.body.projectId);
  project.status = 'disputed';
  await project.save();
  res.status(201).json(await Dispute.create({ ...req.body, openedBy: req.user._id }));
}));
mainRoutes.get('/disputes/my', requireAuth, asyncHandler(async (req, res) => {
  const projects = await Project.find({ $or: [{ clientId: req.user._id }, { designerId: req.user._id }] }).select('_id');
  res.json(await Dispute.find({ projectId: { $in: projects.map((p) => p._id) } }).populate('projectId'));
}));

mainRoutes.get('/premium/plans', asyncHandler(async (req, res) => {
  const query = { isActive: true };
  if (req.query.role) query.roleTarget = { $in: [req.query.role, 'both'] };
  res.json(await PremiumPlan.find(query).sort({ roleTarget: 1, price: 1 }));
}));
mainRoutes.get('/discounts/active', asyncHandler(async (req, res) => {
  const now = new Date();
  const roleTarget = req.query.role || 'both';
  const appliesTo = req.query.appliesTo || 'all';
  const query = {
    isActive: true,
    $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
    $and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
    appliesTo: { $in: [appliesTo, 'all'] }
  };
  if (req.query.home !== 'true') query.roleTarget = { $in: [roleTarget, 'both'] };
  if (req.query.home === 'true') query.showOnHome = true;
  res.json(await Discount.find(query).sort({ showOnHome: -1, createdAt: -1 }));
}));
mainRoutes.post('/discounts/validate', requireAuth, asyncHandler(async (req, res) => {
  const role = req.user.roles.includes('designer') ? 'designer' : 'client';
  const result = await validateDiscount({ code: req.body.code, amount: Number(req.body.amount || 0), appliesTo: req.body.appliesTo || 'all', role });
  res.json({ code: result.discount?.code, discountAmount: result.discountAmount, finalAmount: result.finalAmount });
}));
mainRoutes.post('/premium/subscribe', requireAuth, asyncHandler(async (req, res) => {
  if (req.body.paymentMethod === 'payos') {
    return res.status(201).json(await createPayosPremiumPayment({
      user: req.user,
      planId: req.body.planId,
      discountCode: req.body.discountCode,
      returnUrl: req.body.returnUrl,
      cancelUrl: req.body.cancelUrl
    }));
  }
  if (req.body.paymentMethod === 'wallet') {
    return res.status(201).json(await payPremiumWithWallet({
      user: req.user,
      planId: req.body.planId,
      discountCode: req.body.discountCode
    }));
  }

  const plan = await PremiumPlan.findById(req.body.planId);
  if (!plan) throw new ApiError(404, 'Khong tim thay goi Premium');
  const role = req.user.roles.includes('designer') ? 'designer' : 'client';
  if (plan.roleTarget !== 'both' && plan.roleTarget !== role) throw new ApiError(403, 'Goi Premium khong ap dung cho loai tai khoan hien tai');
  const { discount, discountAmount, finalAmount } = await validateDiscount({ code: req.body.discountCode, amount: plan.price, appliesTo: 'premium', role });
  const startDate = new Date();
  const endDate = new Date(Date.now() + plan.durationDays * 86400000);
  const accountType = plan.code || premiumAccountTypeForRole(role);
  await Transaction.create({
    userId: req.user._id,
    type: 'premium',
    amount: finalAmount,
    status: 'success',
    paymentMethod: req.body.paymentMethod || 'mock',
    metadata: { originalAmount: plan.price, discountCode: discount?.code, discountAmount, planId: plan._id, planName: plan.name, accountType }
  });
  if (discount) {
    discount.usedCount += 1;
    await discount.save();
  }
  await Subscription.updateMany({ userId: req.user._id, status: 'active' }, { status: 'expired' });
  const subscription = await Subscription.create({ userId: req.user._id, planId: plan._id, accountType, startDate, endDate, status: 'active' });
  if (role === 'designer') {
    await DesignerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { userId: req.user._id, accountType, premiumStatus: 'premium', premiumExpiresAt: endDate },
      { upsert: true, new: true }
    );
  }
  if (role === 'client') {
    await ClientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { userId: req.user._id, accountType, premiumStatus: 'premium', premiumExpiresAt: endDate },
      { upsert: true, new: true }
    );
  }
  await Notification.create({
    userId: req.user._id,
    type: 'premium.activated',
    category: 'premium',
    title: 'Tai khoan Premium da kich hoat',
    message: `${plan.name} co hieu luc den ${endDate.toLocaleDateString('vi-VN')}.`,
    actionUrl: role === 'designer' ? '/designer/premium' : '/client/premium'
  });
  res.status(201).json(await subscription.populate('planId'));
}));
mainRoutes.get('/premium/my', requireAuth, asyncHandler(async (req, res) => res.json(await Subscription.find({ userId: req.user._id }).populate('planId'))));

mainRoutes.get('/checklists/:category', asyncHandler(async (req, res) => res.json(await ChecklistTemplate.findOne({ category: req.params.category }))));

// ── Global Search ──
mainRoutes.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: {}, totalCount: 0, query: q });
  const limit = Math.min(Number(req.query.limit) || 5, 10);
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const isAdmin = req.user.roles.includes('admin');
  const isDesigner = req.user.roles.includes('designer');
  const userId = req.user._id;
  const results = {};
  let totalCount = 0;

  // Projects
  const projectQuery = isAdmin ? { title: regex } : isDesigner ? { designerId: userId, title: regex } : { clientId: userId, title: regex };
  const projects = await Project.find(projectQuery).select('title status category').limit(limit).lean();
  if (projects.length) {
    results.projects = projects.map(p => ({
      _id: p._id,
      title: p.title,
      status: p.status,
      subtitle: p.category || '',
      url: isAdmin ? `/admin/projects` : isDesigner ? `/designer/requests` : `/client`
    }));
    totalCount += projects.length;
  }

  // Users (admin only) or Designers (public search)
  if (isAdmin) {
    const users = await User.find({ name: regex }).select('name email avatar roles').limit(limit).lean();
    if (users.length) {
      results.users = users.map(u => ({ _id: u._id, title: u.name, subtitle: u.email, avatar: u.avatar, url: '/admin/users' }));
      totalCount += users.length;
    }
  } else {
    const designers = await DesignerProfile.find({ $or: [{ title: regex }, { skills: regex }] })
      .populate('userId', 'name avatar')
      .select('title ratingAverage slug userId')
      .limit(limit)
      .lean();
    if (designers.length) {
      results.designers = designers.map(d => ({
        _id: d._id,
        title: d.userId?.name || d.title,
        subtitle: d.title || '',
        avatar: d.userId?.avatar,
        rating: d.ratingAverage,
        url: `/designers/${d.slug || d.userId?._id}`
      }));
      totalCount += designers.length;
    }
  }

  // Transactions
  const txQuery = isAdmin ? {} : { userId };
  const txSearch = { ...txQuery, $or: [{ type: regex }, { paymentMethod: regex }] };
  const transactions = await Transaction.find(txSearch).select('type amount status createdAt').sort({ createdAt: -1 }).limit(limit).lean();
  if (transactions.length) {
    results.transactions = transactions.map(t => ({
      _id: t._id,
      title: `${t.type} — ${t.amount?.toLocaleString('vi-VN')}đ`,
      subtitle: new Date(t.createdAt).toLocaleDateString('vi-VN'),
      status: t.status,
      url: isAdmin ? '/admin/transactions' : isDesigner ? '/designer/earnings' : '/client/wallet'
    }));
    totalCount += transactions.length;
  }

  // Withdrawals
  const wdQuery = isAdmin ? { referenceId: regex } : { $or: [{ userId }, { designerId: userId }], referenceId: regex };
  const withdrawals = await Withdrawal.find(wdQuery).select('amount status referenceId createdAt').sort({ createdAt: -1 }).limit(limit).lean();
  if (withdrawals.length) {
    results.withdrawals = withdrawals.map(w => ({
      _id: w._id,
      title: `Rút ${w.amount?.toLocaleString('vi-VN')}đ`,
      subtitle: w.referenceId || new Date(w.createdAt).toLocaleDateString('vi-VN'),
      status: w.status,
      url: isAdmin ? '/admin/withdrawals' : isDesigner ? '/designer/earnings' : '/client/wallet/withdraw'
    }));
    totalCount += withdrawals.length;
  }

  res.json({ results, totalCount, query: q });
}));

// ── Notifications ──
mainRoutes.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const query = { userId: req.user._id };
  if (unreadOnly === 'true') query.isRead = false;
  const p = Math.max(Number(page), 1);
  const l = Math.min(Number(limit) || 20, 50);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user._id, isRead: false })
  ]);
  res.json({
    notifications,
    pagination: { page: p, limit: l, total, hasMore: p * l < total },
    unreadCount
  });
}));

mainRoutes.get('/notifications/unread-count', requireAuth, asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ unreadCount });
}));

mainRoutes.patch('/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  res.json(notif);
}));

mainRoutes.patch('/notifications/read-all', requireAuth, asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, updatedCount: result.modifiedCount });
}));

// ── SSE: real-time notification stream ──
mainRoutes.get('/notifications/stream', requireAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  addSSEClient(req.user._id, res);
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 30000);
  req.on('close', () => clearInterval(keepAlive));
});

mainRoutes.post('/uploads/image', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const result = await uploadToS3(req.file, 'images');
  res.status(201).json(result);
}));
mainRoutes.post('/uploads/avatar', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Vui long chon file avatar');
  if (!req.file.mimetype?.startsWith('image/')) throw new ApiError(400, 'Avatar phai la file anh');
  const result = await uploadToS3(req.file, 'avatar');
  res.status(201).json(result);
}));
mainRoutes.post('/uploads/file', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const result = await uploadToS3(req.file, 'files');
  res.status(201).json(result);
}));

mainRoutes.get('/uploads/file-object', requireAuth, asyncHandler(async (req, res) => {
  const key = String(req.query.key || '');
  const projectId = String(req.query.projectId || '');
  const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';
  if (!key.startsWith('files/') || !objectIdPattern.test(projectId)) throw new ApiError(400, 'File khong hop le');
  const project = await getOwnedProject(req.user, projectId);
  if (!projectHasFileKey(project, key)) throw new ApiError(404, 'Khong tim thay file trong du an');
  const object = await getFromS3(key);
  const fileName = key.split('/').pop() || 'download';
  res.setHeader('Content-Type', object.ContentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  object.Body.pipe(res);
}));

mainRoutes.get('/admin/users', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await User.find(req.query.role ? { roles: req.query.role } : {}).select('-passwordHash').sort({ createdAt: -1 }))));
mainRoutes.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select('-passwordHash'))));
mainRoutes.get('/admin/designers/pending', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await DesignerProfile.find({ verificationStatus: 'pending' }).populate('userId', 'name email avatar'))));
mainRoutes.patch('/admin/designers/:id/verify', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await DesignerProfile.findByIdAndUpdate(req.params.id, { verificationStatus: req.body.status, verificationNote: req.body.note }, { new: true }))));
mainRoutes.get('/admin/projects', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await Project.find(req.query.status ? { status: req.query.status } : {}).populate('clientId designerId', 'name email avatar').sort({ priorityLevel: 1, updatedAt: -1 }))));
mainRoutes.get('/admin/transactions', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await Transaction.find().populate('userId', 'name email').sort({ createdAt: -1 }))));
mainRoutes.get('/admin/withdrawals', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await Withdrawal.find().populate('userId designerId', 'name email').sort({ createdAt: -1 }))));
mainRoutes.post('/admin/withdrawals/:id/sync', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await syncPayosWithdrawal({ withdrawalId: req.params.id, user: req.user }))));
mainRoutes.get('/admin/payos/payout-balance', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await getPayosPayoutBalance())));
mainRoutes.post('/admin/payos/confirm-webhook', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await confirmPayosWebhook(req.body.webhookUrl))));
mainRoutes.get('/admin/disputes', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await Dispute.find().populate('projectId openedBy resolvedBy').sort({ updatedAt: -1 }))));
mainRoutes.get('/admin/disputes/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await Dispute.findById(req.params.id).populate('projectId openedBy resolvedBy'))));
mainRoutes.patch('/admin/disputes/:id/resolve', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Khong tim thay khieu nai');
  dispute.status = 'resolved';
  dispute.adminDecision = req.body.adminDecision;
  dispute.resolutionType = req.body.resolutionType;
  dispute.resolutionAmount = req.body.resolutionAmount;
  dispute.resolvedBy = req.user._id;
  dispute.resolvedAt = new Date();
  await dispute.save();
  if (req.body.resolutionType === 'full_refund' || req.body.resolutionType === 'partial_refund' || req.body.resolutionType === 'redo') {
    await refundProject({ projectId: dispute.projectId, adminId: req.user._id, amount: req.body.resolutionAmount, resolutionType: req.body.resolutionType });
  }
  res.json(dispute);
}));
mainRoutes.get('/admin/reviews', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await Review.find({ reported: true }).populate('reviewerId revieweeId projectId'))));
mainRoutes.patch('/admin/reviews/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await Review.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
mainRoutes.post('/admin/checklists', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.status(201).json(await ChecklistTemplate.create(req.body))));
mainRoutes.patch('/admin/checklists/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await ChecklistTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
mainRoutes.post('/admin/premium-plans', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.status(201).json(await PremiumPlan.create(req.body))));
mainRoutes.patch('/admin/premium-plans/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await PremiumPlan.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
mainRoutes.get('/admin/discounts', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await Discount.find().sort({ createdAt: -1 }))));
mainRoutes.post('/admin/discounts', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (req.body.showOnHome) await Discount.updateMany({ showOnHome: true }, { showOnHome: false });
  res.status(201).json(await Discount.create(req.body));
}));
mainRoutes.patch('/admin/discounts/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (req.body.showOnHome) await Discount.updateMany({ _id: { $ne: req.params.id }, showOnHome: true }, { showOnHome: false });
  res.json(await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));
