import { SavedBankAccount, Transaction, Wallet, Withdrawal } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { verifyCassoLegacySecureToken, verifyCassoWebhookV2Signature } from './cassoService.js';
import { createPayosSinglePayout, getPayosPayout } from './payosService.js';

function generateReferenceId() {
  return `vesd_wd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function generateCassoReferenceId() {
  return `VESDWD${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
}

function normalizeAmount(amount) {
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0) throw new ApiError(400, 'So tien rut phai la so nguyen lon hon 0');
  return value;
}

function normalizeAccountInfo(accountInfo = {}) {
  const toBin = String(accountInfo.toBin || accountInfo.bankBin || '').trim();
  const bankName = String(accountInfo.bankName || accountInfo.bank || '').trim();
  const toAccountNumber = String(accountInfo.toAccountNumber || accountInfo.accountNumber || '').trim();
  const toAccountName = String(accountInfo.toAccountName || accountInfo.accountName || '').trim();
  if (!toBin && !bankName) throw new ApiError(400, 'Thieu ngan hang dich');
  if (!toAccountNumber) throw new ApiError(400, 'Thieu so tai khoan dich');
  if (!toAccountName) throw new ApiError(400, 'Thieu ten tai khoan dich');
  const qrImage = accountInfo.qrImage && typeof accountInfo.qrImage === 'object' ? accountInfo.qrImage : undefined;
  return { toBin, bankName, toAccountNumber, toAccountName, qrImage };
}

function withdrawalOwnerId(withdrawal) {
  return withdrawal.userId || withdrawal.designerId;
}

function normalizeCassoTransaction(rawTransaction = {}) {
  return {
    cassoId: String(rawTransaction.id || rawTransaction.reference || rawTransaction.tid || '').trim(),
    bankReference: String(rawTransaction.reference || rawTransaction.tid || '').trim(),
    description: String(rawTransaction.description || '').trim(),
    amount: Number(rawTransaction.amount || 0),
    runningBalance: Number(rawTransaction.runningBalance ?? rawTransaction.cusum_balance ?? 0),
    transactionDateTime: rawTransaction.transactionDateTime || rawTransaction.when,
    accountNumber: rawTransaction.accountNumber || rawTransaction.bank_sub_acc_id || rawTransaction.subAccId,
    bankName: rawTransaction.bankName,
    bankAbbreviation: rawTransaction.bankAbbreviation,
    counterAccountName: rawTransaction.counterAccountName || rawTransaction.corresponsiveName,
    counterAccountNumber: rawTransaction.counterAccountNumber || rawTransaction.corresponsiveAccount,
    counterAccountBankId: rawTransaction.counterAccountBankId || rawTransaction.corresponsiveBankId,
    counterAccountBankName: rawTransaction.counterAccountBankName || rawTransaction.corresponsiveBankName,
    raw: rawTransaction
  };
}

function extractCassoWithdrawalReference(transaction) {
  const haystack = [transaction.description, transaction.bankReference].filter(Boolean).join(' ');
  return haystack.match(/\bVESDWD[0-9A-Z]{8,}\b/i)?.[0]?.toUpperCase();
}

function normalizeCompareText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
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
    await Wallet.findOneAndUpdate({ userId: withdrawalOwnerId(withdrawal) }, { $inc: { pendingBalance: -withdrawal.amount } }, { upsert: true });
    withdrawal.status = 'paid';
    if (transaction) transaction.status = 'success';
  }

  if (nextState === 'rejected' && !['rejected', 'paid'].includes(withdrawal.status)) {
    await Wallet.findOneAndUpdate(
      { userId: withdrawalOwnerId(withdrawal) },
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

export async function requestCassoWithdrawal({ userId, designerId, amount, accountInfo }) {
  const ownerId = userId || designerId;
  const value = normalizeAmount(amount);
  let normalizedAccount = normalizeAccountInfo(accountInfo);
  const bankAccountId = accountInfo?.bankAccountId;
  if (bankAccountId) {
    const savedAccount = await SavedBankAccount.findOne({ _id: bankAccountId, userId: ownerId });
    if (!savedAccount) throw new ApiError(404, 'Khong tim thay tai khoan ngan hang da luu');
    normalizedAccount = normalizeAccountInfo({
      bankName: savedAccount.bankName,
      bankBin: savedAccount.bankBin,
      accountNumber: savedAccount.accountNumber,
      accountName: savedAccount.accountName,
      qrImage: savedAccount.qrImage || accountInfo?.qrImage
    });
  }
  const referenceId = generateCassoReferenceId();

  const wallet = await Wallet.findOneAndUpdate(
    { userId: ownerId, balance: { $gte: value } },
    { $inc: { balance: -value, pendingBalance: value } },
    { new: true }
  );
  if (!wallet) throw new ApiError(400, 'So du vi khong du de rut tien');

  const withdrawal = await Withdrawal.create({
    userId: ownerId,
    designerId: ownerId,
    amount: value,
    method: 'casso',
    accountInfo: normalizedAccount,
    status: 'pending',
    referenceId,
    metadata: {
      cassoStatus: 'WAITING_BANK_TRANSFER',
      transferContent: referenceId,
      bankAccountId,
      qrImage: normalizedAccount.qrImage
    }
  });

  const transaction = await Transaction.create({
    userId: ownerId,
    type: 'withdrawal',
    amount: value,
    status: 'pending',
    paymentMethod: 'casso',
    metadata: {
      withdrawalId: withdrawal._id,
      cassoReferenceId: referenceId,
      transferContent: referenceId
    }
  });
  withdrawal.transactionId = transaction._id;
  await withdrawal.save();

  if (accountInfo?.saveAccount && !bankAccountId) {
    const existing = await SavedBankAccount.findOne({
      userId: ownerId,
      bankName: normalizedAccount.bankName,
      accountNumber: normalizedAccount.toAccountNumber
    });
    if (!existing) {
      await SavedBankAccount.create({
        userId: ownerId,
        label: accountInfo.label || `${normalizedAccount.bankName} ${normalizedAccount.toAccountNumber}`,
        bankName: normalizedAccount.bankName,
        bankBin: normalizedAccount.toBin,
        accountNumber: normalizedAccount.toAccountNumber,
        accountName: normalizedAccount.toAccountName,
        qrImage: normalizedAccount.qrImage,
        isDefault: Boolean(accountInfo.isDefault)
      });
    }
  }

  return {
    withdrawal,
    wallet,
    transferInstruction: {
      amount: value,
      content: referenceId,
      toBin: normalizedAccount.toBin,
      bankName: normalizedAccount.bankName,
      toAccountNumber: normalizedAccount.toAccountNumber,
      toAccountName: normalizedAccount.toAccountName,
      qrImage: normalizedAccount.qrImage
    }
  };
}

export async function requestPayosWithdrawal({ userId, designerId, amount, accountInfo }) {
  const ownerId = userId || designerId;
  const value = normalizeAmount(amount);
  const normalizedAccount = normalizeAccountInfo(accountInfo);
  const referenceId = generateReferenceId();

  const wallet = await Wallet.findOneAndUpdate(
    { userId: ownerId, balance: { $gte: value } },
    { $inc: { balance: -value, pendingBalance: value } },
    { new: true }
  );
  if (!wallet) throw new ApiError(400, 'So du vi khong du de rut tien');

  const withdrawal = await Withdrawal.create({
    userId: ownerId,
    designerId: ownerId,
    amount: value,
    method: 'payos',
    accountInfo: normalizedAccount,
    status: 'pending',
    referenceId,
    metadata: { payosStatus: 'PENDING' }
  });

  const transaction = await Transaction.create({
    userId: ownerId,
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
      { userId: ownerId },
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
  if (!user.roles.includes('admin') && String(withdrawalOwnerId(withdrawal)) !== String(user._id)) throw new ApiError(403, 'Ban khong co quyen xem yeu cau rut tien nay');
  if (withdrawal.method !== 'payos') throw new ApiError(400, 'Yeu cau rut tien nay dang cho Casso webhook xac nhan');
  if (!withdrawal.payoutId) throw new ApiError(400, 'Yeu cau rut tien chua co ma payout payOS');

  const payosResponse = await getPayosPayout(withdrawal.payoutId);
  await applyPayoutState(withdrawal, payosResponse.data);
  return { withdrawal, payout: payosResponse.data };
}

async function markCassoWithdrawalPaid(withdrawal, cassoTransaction) {
  if (withdrawal.status === 'paid') return { matched: true, skipped: true, reason: 'already_paid', withdrawalId: withdrawal._id };
  if (Math.abs(cassoTransaction.amount) !== Number(withdrawal.amount)) {
    return { matched: true, skipped: true, reason: 'amount_mismatch', withdrawalId: withdrawal._id };
  }

  if (cassoTransaction.counterAccountNumber && withdrawal.accountInfo?.toAccountNumber) {
    const expected = String(withdrawal.accountInfo.toAccountNumber).replace(/\s/g, '');
    const received = String(cassoTransaction.counterAccountNumber).replace(/\s/g, '');
    if (expected && received && expected !== received) {
      return { matched: true, skipped: true, reason: 'counter_account_mismatch', withdrawalId: withdrawal._id };
    }
  }

  if (cassoTransaction.counterAccountName && withdrawal.accountInfo?.toAccountName) {
    const expectedName = normalizeCompareText(withdrawal.accountInfo.toAccountName);
    const receivedName = normalizeCompareText(cassoTransaction.counterAccountName);
    if (expectedName && receivedName && expectedName !== receivedName) {
      return { matched: true, skipped: true, reason: 'counter_account_name_mismatch', withdrawalId: withdrawal._id };
    }
  }

  const transaction = withdrawal.transactionId ? await Transaction.findById(withdrawal.transactionId) : null;
  await Wallet.findOneAndUpdate({ userId: withdrawalOwnerId(withdrawal) }, { $inc: { pendingBalance: -withdrawal.amount } }, { upsert: true });
  withdrawal.status = 'paid';
  withdrawal.metadata = {
    ...(withdrawal.metadata || {}),
    cassoStatus: 'PAID',
    cassoTransactionId: cassoTransaction.cassoId,
    cassoBankReference: cassoTransaction.bankReference,
    cassoPaidAt: new Date(),
    cassoData: cassoTransaction.raw
  };

  if (transaction) {
    transaction.status = 'success';
    transaction.metadata = {
      ...(transaction.metadata || {}),
      cassoTransactionId: cassoTransaction.cassoId,
      cassoBankReference: cassoTransaction.bankReference,
      cassoData: cassoTransaction.raw
    };
    await transaction.save();
  }

  await withdrawal.save();
  return { matched: true, paid: true, withdrawalId: withdrawal._id };
}

export async function handleCassoWithdrawalWebhook({ body, signature, secureToken }) {
  const hasSignature = Boolean(signature);
  const valid = hasSignature ? verifyCassoWebhookV2Signature(signature, body) : verifyCassoLegacySecureToken(secureToken);
  if (!valid) throw new ApiError(401, 'Chu ky Casso webhook khong hop le');
  if (Number(body?.error || 0) !== 0) return { success: true, ignored: true };

  const rawTransactions = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
  const results = [];

  for (const rawTransaction of rawTransactions) {
    const cassoTransaction = normalizeCassoTransaction(rawTransaction);
    const referenceId = extractCassoWithdrawalReference(cassoTransaction);
    if (!referenceId) {
      results.push({ matched: false, reason: 'missing_withdrawal_reference', cassoId: cassoTransaction.cassoId });
      continue;
    }

    const withdrawal = await Withdrawal.findOne({
      referenceId,
      method: 'casso',
      status: { $in: ['pending', 'approved', 'paid'] }
    });
    if (!withdrawal) {
      results.push({ matched: false, reason: 'withdrawal_not_found', referenceId, cassoId: cassoTransaction.cassoId });
      continue;
    }

    results.push(await markCassoWithdrawalPaid(withdrawal, cassoTransaction));
  }

  return {
    success: true,
    processed: results.filter((item) => item.paid).length,
    results
  };
}
