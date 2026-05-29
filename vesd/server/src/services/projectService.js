import { ChecklistTemplate, Project, ProjectComment, Transaction, Wallet } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { validateDiscount } from './discountService.js';
import { calculatePlatformFee } from './walletService.js';

export function canAccessProject(user, project) {
  return user.roles.includes('admin') || String(project.clientId) === String(user._id) || String(project.designerId) === String(user._id);
}

export async function getOwnedProject(user, id) {
  const project = await Project.findById(id);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  if (!canAccessProject(user, project)) throw new ApiError(403, 'Ban khong co quyen xem du an nay');
  return project;
}

async function getProjectEscrowStats(projectId) {
  const [depositTransactions, releaseTransactions] = await Promise.all([
    Transaction.find({ projectId, type: 'deposit', status: 'success' }).select('amount metadata'),
    Transaction.find({ projectId, type: 'release', status: 'success' }).select('amount platformFee metadata')
  ]);
  const escrowPaid = depositTransactions.reduce((sum, transaction) => sum + Number(transaction.metadata?.escrowAmount ?? transaction.amount ?? 0), 0);
  const released = releaseTransactions.reduce((sum, transaction) => {
    const grossAmount = transaction.metadata?.grossAmount;
    return sum + Number(grossAmount ?? (Number(transaction.amount || 0) + Number(transaction.platformFee || 0)));
  }, 0);
  return { escrowPaid, released, remaining: Math.max(escrowPaid - released, 0) };
}

async function releaseProjectFunds({ project, amount, reason }) {
  const value = Math.round(Number(amount || 0));
  if (!project.designerId || value <= 0) return null;
  const { remaining } = await getProjectEscrowStats(project._id);
  const releaseAmount = Math.min(value, remaining);
  if (releaseAmount <= 0) return null;
  const platformFee = calculatePlatformFee(releaseAmount);
  const designerAmount = Math.max(releaseAmount - platformFee, 0);

  const transaction = await Transaction.create({
    userId: project.designerId,
    projectId: project._id,
    type: 'release',
    amount: designerAmount,
    platformFee,
    status: 'success',
    paymentMethod: 'escrow',
    metadata: {
      grossAmount: releaseAmount,
      reason,
      feeCollectedAt: 'completion'
    }
  });
  await Wallet.findOneAndUpdate(
    { userId: project.designerId },
    { $inc: { balance: designerAmount, totalEarned: designerAmount } },
    { upsert: true }
  );
  await Wallet.findOneAndUpdate(
    { userId: project.clientId },
    { $inc: { escrowBalance: -releaseAmount } },
    { upsert: true }
  );
  return transaction;
}

export async function fundEscrow({ projectId, userId, paymentMethod = 'mock', discountCode }) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client cua du an duoc thanh toan');
  const amount = project.agreement?.price || project.budget?.agreed || project.budget?.max || 0;
  if (amount <= 0) throw new ApiError(400, 'Du an chua co so tien hop le');
  const { discount, discountAmount, finalAmount } = await validateDiscount({ code: discountCode, amount, appliesTo: 'project', role: 'client' });
  const escrowAmount = Math.round(finalAmount);
  const totalDue = escrowAmount;
  if (paymentMethod === 'wallet') {
    const wallet = await Wallet.findOneAndUpdate(
      { userId, balance: { $gte: totalDue } },
      { $inc: { balance: -totalDue, escrowBalance: escrowAmount, totalSpent: totalDue } },
      { new: true }
    );
    if (!wallet) {
      const currentWallet = await Wallet.findOne({ userId }).select('balance');
      const availableBalance = Number(currentWallet?.balance || 0);
      throw new ApiError(402, 'So du vi khong du de thanh toan du an', {
        action: 'topup',
        requiredAmount: totalDue,
        availableBalance,
        topupAmount: Math.max(totalDue - availableBalance, 0)
      });
    }
  } else {
    await Wallet.findOneAndUpdate({ userId }, { $inc: { escrowBalance: escrowAmount, totalSpent: totalDue } }, { upsert: true });
  }
  await Transaction.create({
    userId,
    projectId,
    type: 'deposit',
    amount: totalDue,
    platformFee: 0,
    status: 'success',
    paymentMethod,
    metadata: {
      purpose: 'escrow',
      originalAmount: amount,
      escrowAmount,
      totalDue,
      feeCollectedAt: 'completion',
      platformFeeRate: 0.05,
      discountCode: discount?.code,
      discountAmount
    }
  });
  if (discount) {
    discount.usedCount += 1;
    await discount.save();
  }
  project.status = 'escrow_funded';
  await project.save();
  return project;
}

export async function approveMilestone({ project, milestoneId, userId }) {
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client duoc duyet milestone');
  if (project.status === 'disputed') throw new ApiError(400, 'Du an dang khieu nai, khong the duyet milestone');
  const milestone = project.milestones.id(milestoneId);
  if (!milestone) throw new ApiError(404, 'Khong tim thay milestone');
  if (milestone.status === 'approved') return project;
  milestone.status = 'approved';
  milestone.approvedAt = new Date();
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

export async function completeProject({ project, userId, allowMissingFiles = false }) {
  if (String(project.clientId) !== String(userId)) throw new ApiError(403, 'Chi client duoc hoan tat du an');
  if (project.status === 'completed') {
    await releaseProjectFunds({ project, amount: (await getProjectEscrowStats(project._id)).remaining, reason: 'project_completed' });
    return project;
  }
  const template = await ChecklistTemplate.findOne({ category: project.category });
  if (template) {
    const finalFiles = project.finalFiles || [];
    const uploadedLabels = new Set(finalFiles.map((file) => String(file.checklistItem || '').toLowerCase()).filter(Boolean));
    const uploadedExtensions = new Set(finalFiles.map((file) => String(file.name || file.url || '').split('.').pop()?.toLowerCase()).filter(Boolean));
    const missing = template.items.filter((item) => {
      if (!item.required) return false;
      const labelMatched = uploadedLabels.has(String(item.label || '').toLowerCase());
      const formatMatched = (item.acceptedFormats || []).some((format) => uploadedExtensions.has(String(format).toLowerCase()));
      return !labelMatched && !formatMatched;
    });
    if (missing.length && !allowMissingFiles) throw new ApiError(400, 'Thiếu file bàn giao bắt buộc', missing.map((item) => item.label));
  }
  await releaseProjectFunds({ project, amount: (await getProjectEscrowStats(project._id)).remaining, reason: 'project_completed' });
  project.status = 'completed';
  await project.save();
  return project;
}

export async function refundProject({ projectId, adminId, amount, resolutionType = 'full_refund' }) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  const { remaining } = await getProjectEscrowStats(projectId);
  const refundAmount = Math.min(Number(amount || remaining || 0), remaining);
  if (refundAmount <= 0) throw new ApiError(400, 'Khong con so tien escrow de hoan');
  await Transaction.create({ userId: project.clientId, projectId, type: 'refund', amount: refundAmount, status: 'success', paymentMethod: 'escrow', metadata: { adminId, resolutionType } });
  await Wallet.findOneAndUpdate({ userId: project.clientId }, { $inc: { balance: refundAmount, escrowBalance: -refundAmount } }, { upsert: true });
  project.status = resolutionType === 'redo' ? 'in_progress' : 'cancelled';
  await project.save();
  return project;
}
