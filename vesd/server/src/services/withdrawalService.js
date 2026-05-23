import { Transaction, Wallet, Withdrawal } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { createPayosSinglePayout, getPayosPayout } from './payosService.js';

function generateReferenceId() {
  return `vesd_wd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function normalizeAmount(amount) {
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0) throw new ApiError(400, 'So tien rut phai la so nguyen lon hon 0');
  return value;
}

function normalizeAccountInfo(accountInfo = {}) {
  const toBin = String(accountInfo.toBin || accountInfo.bankBin || '').trim();
  const toAccountNumber = String(accountInfo.toAccountNumber || accountInfo.accountNumber || '').trim();
  const toAccountName = String(accountInfo.toAccountName || accountInfo.accountName || '').trim();
  if (!toBin) throw new ApiError(400, 'Thieu ma ngan hang dich');
  if (!toAccountNumber) throw new ApiError(400, 'Thieu so tai khoan dich');
  return { toBin, toAccountNumber, toAccountName };
}

function resolvePayoutState(payoutData) {
  const approvalState = String(payoutData?.approvalState || '').toUpperCase();
  const transactions = Object.values(payoutData?.transactions || {});
  const transactionStates = transactions.map((item) => String(item?.state || '').toUpperCase());

  if (['SUCCEEDED', 'COMPLETED'].includes(approvalState) || transactionStates.some((state) => ['SUCCEEDED', 'COMPLETED'].includes(state))) return 'paid';
  if (['FAILED', 'CANCELLED', 'REJECTED'].includes(approvalState) || transactionStates.some((state) => ['FAILED', 'CANCELLED', 'REJECTED'].includes(state))) return 'rejected';
  return 'approved';
}

async function applyPayoutState(withdrawal, payoutData) {
  const nextState = resolvePayoutState(payoutData);
  const transaction = withdrawal.transactionId ? await Transaction.findById(withdrawal.transactionId) : null;

  if (nextState === 'paid' && withdrawal.status !== 'paid') {
    await Wallet.findOneAndUpdate({ userId: withdrawal.designerId }, { $inc: { pendingBalance: -withdrawal.amount } }, { upsert: true });
    withdrawal.status = 'paid';
    if (transaction) transaction.status = 'success';
  }

  if (nextState === 'rejected' && !['rejected', 'paid'].includes(withdrawal.status)) {
    await Wallet.findOneAndUpdate(
      { userId: withdrawal.designerId },
      { $inc: { balance: withdrawal.amount, pendingBalance: -withdrawal.amount } },
      { upsert: true }
    );
    withdrawal.status = 'rejected';
    if (transaction) transaction.status = 'failed';
  }

  withdrawal.metadata = { ...(withdrawal.metadata || {}), payosData: payoutData };
  if (transaction) {
    transaction.metadata = { ...(transaction.metadata || {}), payosData: payoutData };
    await transaction.save();
  }
  await withdrawal.save();
  return withdrawal;
}

export async function requestPayosWithdrawal({ designerId, amount, accountInfo }) {
  const value = normalizeAmount(amount);
  const normalizedAccount = normalizeAccountInfo(accountInfo);
  const referenceId = generateReferenceId();

  const wallet = await Wallet.findOneAndUpdate(
    { userId: designerId, balance: { $gte: value } },
    { $inc: { balance: -value, pendingBalance: value } },
    { new: true }
  );
  if (!wallet) throw new ApiError(400, 'So du vi khong du de rut tien');

  const withdrawal = await Withdrawal.create({
    designerId,
    amount: value,
    method: 'payos',
    accountInfo: normalizedAccount,
    status: 'pending',
    referenceId,
    metadata: { payosStatus: 'PENDING' }
  });

  const transaction = await Transaction.create({
    userId: designerId,
    type: 'withdrawal',
    amount: value,
    status: 'pending',
    paymentMethod: 'payos',
    metadata: { withdrawalId: withdrawal._id, payosReferenceId: referenceId }
  });
  withdrawal.transactionId = transaction._id;
  await withdrawal.save();

  try {
    const payosResponse = await createPayosSinglePayout({
      referenceId,
      amount: value,
      description: 'Rut tien VESD',
      toBin: normalizedAccount.toBin,
      toAccountNumber: normalizedAccount.toAccountNumber,
      category: ['withdrawal']
    });

    withdrawal.payoutId = payosResponse.data?.id;
    withdrawal.status = 'approved';
    withdrawal.metadata = { ...(withdrawal.metadata || {}), payosStatus: payosResponse.data?.approvalState, payosData: payosResponse.data };
    transaction.metadata = { ...(transaction.metadata || {}), payosPayoutId: payosResponse.data?.id, payosData: payosResponse.data };
    await transaction.save();
    await withdrawal.save();

    await applyPayoutState(withdrawal, payosResponse.data);
    return { withdrawal, wallet, payout: payosResponse.data };
  } catch (error) {
    await Wallet.findOneAndUpdate(
      { userId: designerId },
      { $inc: { balance: value, pendingBalance: -value } },
      { upsert: true }
    );
    withdrawal.status = 'rejected';
    withdrawal.metadata = { ...(withdrawal.metadata || {}), payosStatus: 'CREATE_FAILED', payosError: error.details || error.message };
    transaction.status = 'failed';
    transaction.metadata = { ...(transaction.metadata || {}), payosError: error.details || error.message };
    await transaction.save();
    await withdrawal.save();
    throw error;
  }
}

export async function syncPayosWithdrawal({ withdrawalId, user }) {
  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) throw new ApiError(404, 'Khong tim thay yeu cau rut tien');
  if (!user.roles.includes('admin') && String(withdrawal.designerId) !== String(user._id)) throw new ApiError(403, 'Ban khong co quyen xem yeu cau rut tien nay');
  if (!withdrawal.payoutId) throw new ApiError(400, 'Yeu cau rut tien chua co ma payout payOS');

  const payosResponse = await getPayosPayout(withdrawal.payoutId);
  await applyPayoutState(withdrawal, payosResponse.data);
  return { withdrawal, payout: payosResponse.data };
}
