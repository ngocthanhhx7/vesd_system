import { ChecklistTemplate, Project, ProjectComment, Transaction, Wallet } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { validateDiscount } from './discountService.js';

export function canAccessProject(user, project) {
  return user.roles.includes('admin') || String(project.clientId) === String(user._id) || String(project.designerId) === String(user._id);
}

export async function getOwnedProject(user, id) {
  const project = await Project.findById(id);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  if (!canAccessProject(user, project)) throw new ApiError(403, 'Ban khong co quyen xem du an nay');
  return project;
}

export async function fundEscrow({ projectId, userId, paymentMethod = 'mock', discountCode }) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client cua du an duoc thanh toan');
  const amount = project.agreement?.price || project.budget?.agreed || project.budget?.max || 0;
  if (amount <= 0) throw new ApiError(400, 'Du an chua co so tien hop le');
  const { discount, discountAmount, finalAmount } = await validateDiscount({ code: discountCode, amount, appliesTo: 'project', role: 'client' });
  const platformFee = Math.round(finalAmount * 0.08);
  await Transaction.create({ userId, projectId, type: 'deposit', amount: finalAmount, platformFee, status: 'success', paymentMethod, metadata: { originalAmount: amount, discountCode: discount?.code, discountAmount } });
  if (discount) {
    discount.usedCount += 1;
    await discount.save();
  }
  await Wallet.findOneAndUpdate({ userId }, { $inc: { escrowBalance: finalAmount, totalSpent: finalAmount + platformFee } }, { upsert: true });
  project.status = 'escrow_funded';
  await project.save();
  return project;
}

export async function approveMilestone({ project, milestoneId, userId }) {
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client duoc duyet milestone');
  if (project.status === 'disputed') throw new ApiError(400, 'Du an dang khieu nai, khong the release tien');
  const milestone = project.milestones.id(milestoneId);
  if (!milestone) throw new ApiError(404, 'Khong tim thay milestone');
  milestone.status = 'approved';
  milestone.approvedAt = new Date();
  const amount = milestone.amount || 0;
  if (project.designerId && amount > 0) {
    await Transaction.create({ userId: project.designerId, projectId: project._id, type: 'release', amount, platformFee: Math.round(amount * 0.08), status: 'success', paymentMethod: 'escrow' });
    await Wallet.findOneAndUpdate({ userId: project.designerId }, { $inc: { balance: amount * 0.92, totalEarned: amount * 0.92 } }, { upsert: true });
    await Wallet.findOneAndUpdate({ userId: project.clientId }, { $inc: { escrowBalance: -amount } }, { upsert: true });
  }
  if (project.milestones.every((m) => m.status === 'approved')) project.status = 'final_submitted';
  await project.save();
  return project;
}

export async function requestRevision({ project, userId, content }) {
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client duoc yeu cau chinh sua');
  if (project.revisionUsed >= project.revisionLimit) throw new ApiError(400, 'Da vuot gioi han so lan chinh sua');
  project.revisionUsed += 1;
  project.status = 'revision_requested';
  await project.save();
  await ProjectComment.create({ projectId: project._id, senderId: userId, content: content || 'Yeu cau chinh sua', type: 'feedback' });
  return project;
}

export async function completeProject({ project, userId }) {
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client duoc hoan tat du an');
  const template = await ChecklistTemplate.findOne({ category: project.category });
  if (template) {
    const uploadedLabels = new Set((project.finalFiles || []).map((file) => file.checklistItem).filter(Boolean));
    const missing = template.items.filter((item) => item.required && !uploadedLabels.has(item.label));
    if (missing.length) throw new ApiError(400, 'Thieu file ban giao bat buoc', missing.map((item) => item.label));
  }
  project.status = 'completed';
  await project.save();
  return project;
}

export async function refundProject({ projectId, adminId, amount, resolutionType = 'full_refund' }) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  const refundAmount = amount || project.agreement?.price || project.budget?.agreed || 0;
  await Transaction.create({ userId: project.clientId, projectId, type: 'refund', amount: refundAmount, status: 'success', paymentMethod: 'escrow', metadata: { adminId, resolutionType } });
  await Wallet.findOneAndUpdate({ userId: project.clientId }, { $inc: { balance: refundAmount, escrowBalance: -refundAmount } }, { upsert: true });
  project.status = resolutionType === 'redo' ? 'in_progress' : 'cancelled';
  await project.save();
  return project;
}
