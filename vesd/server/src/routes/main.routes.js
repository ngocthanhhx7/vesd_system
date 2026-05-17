import { Router } from 'express';
import multer from 'multer';
import { uploadToS3 } from '../utils/s3.js';
import slugify from 'slugify';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler, ApiError } from '../utils/apiError.js';
import {
  ChecklistTemplate,
  ClientProfile,
  Discount,
  DesignerProfile,
  Dispute,
  Notification,
  Portfolio,
  PremiumPlan,
  Project,
  ProjectComment,
  Review,
  Subscription,
  Transaction,
  User,
  Wallet,
  Withdrawal
} from '../models/index.js';
import { approveMilestone, completeProject, fundEscrow, getOwnedProject, refundProject, requestRevision } from '../services/projectService.js';
import { validateDiscount } from '../services/discountService.js';

export const mainRoutes = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const pageParams = (req) => ({ page: Math.max(Number(req.query.page || 1), 1), limit: Math.min(Number(req.query.limit || 12), 50) });
const premiumAccountTypeForRole = (role) => (role === 'designer' ? 'designer_premium' : 'business_premium');
const listQuery = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

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
  const allowed = ['name', 'phone', 'avatar'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true }).select('-passwordHash');
  res.json(user);
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
  const project = await Project.create({ ...req.body, clientId: req.user._id, priorityLevel, status: 'draft' });
  res.status(201).json(project);
}));
mainRoutes.get('/projects/my', requireAuth, asyncHandler(async (req, res) => {
  const query = req.user.roles.includes('admin') ? {} : req.user.roles.includes('designer') ? { designerId: req.user._id } : { clientId: req.user._id };
  res.json(await Project.find(query).populate('clientId designerId', 'name avatar email').sort({ updatedAt: -1 }));
}));
mainRoutes.get('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  const comments = await ProjectComment.find({ projectId: project._id }).populate('senderId', 'name avatar');
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
  milestone.status = 'submitted';
  milestone.submittedFiles = req.body.files || [];
  project.status = 'submitted';
  await project.save();
  res.json(project);
}));
mainRoutes.post('/projects/:id/final-files', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.user, req.params.id);
  if (String(project.designerId) !== String(req.user._id)) throw new ApiError(403, 'Khong phai designer cua du an');
  project.finalFiles = req.body.files || [];
  project.status = 'final_submitted';
  await project.save();
  await ProjectComment.create({ projectId: project._id, senderId: req.user._id, content: req.body.note || 'Designer da ban giao file cuoi', attachments: req.body.files || [], type: 'system' });
  res.json(project);
}));
mainRoutes.post('/projects/:id/milestones/:milestoneId/approve', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await approveMilestone({ project: await getOwnedProject(req.user, req.params.id), milestoneId: req.params.milestoneId, userId: req.user._id }))));
mainRoutes.post('/projects/:id/revision', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await requestRevision({ project: await getOwnedProject(req.user, req.params.id), userId: req.user._id, content: req.body.content }))));
mainRoutes.post('/projects/:id/complete', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await completeProject({ project: await getOwnedProject(req.user, req.params.id), userId: req.user._id }))));

mainRoutes.post('/payments/escrow', requireAuth, requireRole('client'), asyncHandler(async (req, res) => res.json(await fundEscrow({ projectId: req.body.projectId, userId: req.user._id, paymentMethod: req.body.paymentMethod, discountCode: req.body.discountCode }))));
mainRoutes.post('/payments/mock-success', requireAuth, asyncHandler(async (_req, res) => res.json({ status: 'success' })));
mainRoutes.post('/payments/release', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await approveMilestone({ project: await Project.findById(req.body.projectId), milestoneId: req.body.milestoneId, userId: req.body.clientId }))));
mainRoutes.post('/payments/refund', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await refundProject({ projectId: req.body.projectId, adminId: req.user._id, amount: req.body.amount }))));
mainRoutes.get('/transactions/my', requireAuth, asyncHandler(async (req, res) => res.json(await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 }))));
mainRoutes.get('/wallet/my', requireAuth, asyncHandler(async (req, res) => res.json(await Wallet.findOne({ userId: req.user._id }))));
mainRoutes.post('/withdrawals', requireAuth, requireRole('designer'), asyncHandler(async (req, res) => res.status(201).json(await Withdrawal.create({ ...req.body, designerId: req.user._id }))));

mainRoutes.post('/reviews', requireAuth, asyncHandler(async (req, res) => {
  const review = await Review.create({ ...req.body, reviewerId: req.user._id });
  const stats = await Review.aggregate([{ $match: { revieweeId: review.revieweeId, status: 'visible' } }, { $group: { _id: '$revieweeId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  if (stats[0]) await DesignerProfile.findOneAndUpdate({ userId: review.revieweeId }, { ratingAverage: stats[0].avg, ratingCount: stats[0].count });
  res.status(201).json(review);
}));
mainRoutes.get('/reviews/designer/:designerId', asyncHandler(async (req, res) => res.json(await Review.find({ revieweeId: req.params.designerId, status: 'visible' }).populate('reviewerId', 'name avatar'))));

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
  res.json(await Discount.find({
    isActive: true,
    $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
    $and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
    roleTarget: { $in: [roleTarget, 'both'] },
    appliesTo: { $in: [appliesTo, 'all'] }
  }).sort({ createdAt: -1 }));
}));
mainRoutes.post('/discounts/validate', requireAuth, asyncHandler(async (req, res) => {
  const role = req.user.roles.includes('designer') ? 'designer' : 'client';
  const result = await validateDiscount({ code: req.body.code, amount: Number(req.body.amount || 0), appliesTo: req.body.appliesTo || 'all', role });
  res.json({ code: result.discount?.code, discountAmount: result.discountAmount, finalAmount: result.finalAmount });
}));
mainRoutes.post('/premium/subscribe', requireAuth, asyncHandler(async (req, res) => {
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
    title: 'Tai khoan Premium da kich hoat',
    message: `${plan.name} co hieu luc den ${endDate.toLocaleDateString('vi-VN')}.`,
    type: 'premium',
    link: role === 'designer' ? '/designer/premium' : '/client/premium'
  });
  res.status(201).json(await subscription.populate('planId'));
}));
mainRoutes.get('/premium/my', requireAuth, asyncHandler(async (req, res) => res.json(await Subscription.find({ userId: req.user._id }).populate('planId'))));

mainRoutes.get('/checklists/:category', asyncHandler(async (req, res) => res.json(await ChecklistTemplate.findOne({ category: req.params.category }))));
mainRoutes.get('/notifications', requireAuth, asyncHandler(async (req, res) => res.json(await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30))));
mainRoutes.patch('/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => res.json(await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true }))));

mainRoutes.post('/uploads/image', requireAuth, upload.single('file'), async (req, res) => {
  const result = await uploadToS3(req.file, 'images');
  res.status(201).json(result);
});
mainRoutes.post('/uploads/file', requireAuth, upload.single('file'), async (req, res) => {
  const result = await uploadToS3(req.file, 'files');
  res.status(201).json(result);
});

mainRoutes.get('/admin/users', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await User.find(req.query.role ? { roles: req.query.role } : {}).select('-passwordHash').sort({ createdAt: -1 }))));
mainRoutes.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select('-passwordHash'))));
mainRoutes.get('/admin/designers/pending', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await DesignerProfile.find({ verificationStatus: 'pending' }).populate('userId', 'name email avatar'))));
mainRoutes.patch('/admin/designers/:id/verify', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await DesignerProfile.findByIdAndUpdate(req.params.id, { verificationStatus: req.body.status, verificationNote: req.body.note }, { new: true }))));
mainRoutes.get('/admin/projects', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await Project.find(req.query.status ? { status: req.query.status } : {}).populate('clientId designerId', 'name email avatar').sort({ priorityLevel: 1, updatedAt: -1 }))));
mainRoutes.get('/admin/transactions', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => res.json(await Transaction.find().populate('userId', 'name email').sort({ createdAt: -1 }))));
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
mainRoutes.post('/admin/discounts', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.status(201).json(await Discount.create(req.body))));
mainRoutes.patch('/admin/discounts/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => res.json(await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
