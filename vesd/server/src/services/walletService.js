import { Project, Transaction, Wallet } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

export const WALLET_MIN_TOPUP_AMOUNT = 10000;
export const PROJECT_PLATFORM_FEE_RATE = 0.08;

export function normalizeWalletAmount(amount, { min = 1 } = {}) {
  const value = Number(amount);
  if (!Number.isInteger(value) || value < min) throw new ApiError(400, `So tien toi thieu la ${min.toLocaleString('vi-VN')} VND`);
  return value;
}

export function calculatePlatformFee(amount) {
  return Math.round(Number(amount || 0) * PROJECT_PLATFORM_FEE_RATE);
}

export async function transferWalletToDesigner({ sender, designerId, projectId, amount, note }) {
  const value = normalizeWalletAmount(amount, { min: 1 });
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  if (project.status !== 'completed') throw new ApiError(400, 'Chi duoc chuyen tien truc tiep khi du an da hoan thanh');
  if (String(project.clientId) !== String(sender._id)) throw new ApiError(403, 'Chi client cua du an duoc chuyen tien cho designer');
  if (!project.designerId || String(project.designerId) !== String(designerId)) throw new ApiError(400, 'Designer khong khop voi du an');

  const senderWallet = await Wallet.findOneAndUpdate(
    { userId: sender._id, balance: { $gte: value } },
    { $inc: { balance: -value, totalSpent: value } },
    { new: true }
  );
  if (!senderWallet) throw new ApiError(400, 'So du vi khong du de chuyen tien');

  await Wallet.findOneAndUpdate(
    { userId: designerId },
    { $inc: { balance: value, totalEarned: value } },
    { upsert: true }
  );

  const metadata = {
    projectId,
    senderId: sender._id,
    designerId,
    note,
    purpose: 'completed_project_direct_transfer'
  };
  const [senderTransaction, designerTransaction] = await Promise.all([
    Transaction.create({
      userId: sender._id,
      projectId,
      type: 'transfer',
      amount: value,
      status: 'success',
      paymentMethod: 'wallet',
      metadata: { ...metadata, direction: 'out' }
    }),
    Transaction.create({
      userId: designerId,
      projectId,
      type: 'transfer',
      amount: value,
      status: 'success',
      paymentMethod: 'wallet',
      metadata: { ...metadata, direction: 'in' }
    })
  ]);

  return { senderWallet, senderTransaction, designerTransaction };
}
