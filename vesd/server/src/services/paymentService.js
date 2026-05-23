import {
  ClientProfile,
  DesignerProfile,
  Discount,
  Notification,
  PremiumPlan,
  Project,
  Subscription,
  Transaction,
  Wallet
} from '../models/index.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { validateDiscount } from './discountService.js';
import { createPayosPaymentLink, getPayosPaymentRequest, verifyPayosPaymentSignature } from './payosService.js';

const frontendBaseUrl = () => env.clientUrl.split(',')[0].trim().replace(/\/$/, '');
const premiumAccountTypeForRole = (role) => (role === 'designer' ? 'designer_premium' : 'business_premium');

function generateOrderCode() {
  return Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
}

function paymentDescription(orderCode) {
  return `VESD${String(orderCode).slice(-5)}`.slice(0, 9);
}

function buildCheckoutUrls(path, orderCode, returnUrl, cancelUrl) {
  const baseUrl = frontendBaseUrl();
  return {
    returnUrl: returnUrl || `${baseUrl}${path}?payos=success&orderCode=${orderCode}`,
    cancelUrl: cancelUrl || `${baseUrl}${path}?payos=cancel&orderCode=${orderCode}`
  };
}

function checkoutResponse(transaction, payosResponse) {
  return {
    transaction,
    payment: payosResponse.data,
    checkoutUrl: payosResponse.data?.checkoutUrl,
    qrCode: payosResponse.data?.qrCode
  };
}

async function markPayosCreationFailed(transaction, error) {
  transaction.status = 'failed';
  transaction.metadata = {
    ...(transaction.metadata || {}),
    payosStatus: 'CREATE_FAILED',
    payosError: error.details || error.message
  };
  await transaction.save();
}

export async function createPayosEscrowPayment({ projectId, user, discountCode, returnUrl, cancelUrl }) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Khong tim thay du an');
  if (String(project.clientId) !== String(user._id)) throw new ApiError(403, 'Chi client cua du an duoc thanh toan');

  const originalAmount = project.agreement?.price || project.budget?.agreed || project.budget?.max || 0;
  if (originalAmount <= 0) throw new ApiError(400, 'Du an chua co so tien hop le');

  const { discount, discountAmount, finalAmount } = await validateDiscount({
    code: discountCode,
    amount: originalAmount,
    appliesTo: 'project',
    role: 'client'
  });
  const amount = Math.round(finalAmount);
  const platformFee = Math.round(amount * 0.08);
  const orderCode = generateOrderCode();
  const urls = buildCheckoutUrls('/client/escrow', orderCode, returnUrl, cancelUrl);

  const transaction = await Transaction.create({
    userId: user._id,
    projectId,
    type: 'deposit',
    amount,
    platformFee,
    status: 'pending',
    paymentMethod: 'payos',
    metadata: {
      purpose: 'escrow',
      originalAmount,
      discountId: discount?._id,
      discountCode: discount?.code,
      discountAmount,
      payosOrderCode: orderCode,
      payosStatus: 'PENDING'
    }
  });

  try {
    const payosResponse = await createPayosPaymentLink({
      orderCode,
      amount,
      description: paymentDescription(orderCode),
      buyerName: user.name,
      buyerEmail: user.email,
      items: [{ name: project.title, quantity: 1, price: amount }],
      returnUrl: urls.returnUrl,
      cancelUrl: urls.cancelUrl
    });
    transaction.metadata = {
      ...transaction.metadata,
      payosPaymentLinkId: payosResponse.data?.paymentLinkId,
      payosCheckoutUrl: payosResponse.data?.checkoutUrl,
      payosQrCode: payosResponse.data?.qrCode
    };
    await transaction.save();
    return checkoutResponse(transaction, payosResponse);
  } catch (error) {
    await markPayosCreationFailed(transaction, error);
    throw error;
  }
}

export async function createPayosPremiumPayment({ user, planId, discountCode, returnUrl, cancelUrl }) {
  const plan = await PremiumPlan.findById(planId);
  if (!plan) throw new ApiError(404, 'Khong tim thay goi Premium');

  const role = user.roles.includes('designer') ? 'designer' : 'client';
  if (plan.roleTarget !== 'both' && plan.roleTarget !== role) throw new ApiError(403, 'Goi Premium khong ap dung cho loai tai khoan hien tai');

  const { discount, discountAmount, finalAmount } = await validateDiscount({
    code: discountCode,
    amount: plan.price,
    appliesTo: 'premium',
    role
  });
  const amount = Math.round(finalAmount);
  const orderCode = generateOrderCode();
  const accountType = plan.code || premiumAccountTypeForRole(role);
  const urls = buildCheckoutUrls(role === 'designer' ? '/designer/premium' : '/client/premium', orderCode, returnUrl, cancelUrl);

  const transaction = await Transaction.create({
    userId: user._id,
    type: 'premium',
    amount,
    status: 'pending',
    paymentMethod: 'payos',
    metadata: {
      purpose: 'premium',
      originalAmount: plan.price,
      discountId: discount?._id,
      discountCode: discount?.code,
      discountAmount,
      planId: plan._id,
      planName: plan.name,
      accountType,
      role,
      payosOrderCode: orderCode,
      payosStatus: 'PENDING'
    }
  });

  try {
    const payosResponse = await createPayosPaymentLink({
      orderCode,
      amount,
      description: paymentDescription(orderCode),
      buyerName: user.name,
      buyerEmail: user.email,
      items: [{ name: plan.name, quantity: 1, price: amount }],
      returnUrl: urls.returnUrl,
      cancelUrl: urls.cancelUrl
    });
    transaction.metadata = {
      ...transaction.metadata,
      payosPaymentLinkId: payosResponse.data?.paymentLinkId,
      payosCheckoutUrl: payosResponse.data?.checkoutUrl,
      payosQrCode: payosResponse.data?.qrCode
    };
    await transaction.save();
    return checkoutResponse(transaction, payosResponse);
  } catch (error) {
    await markPayosCreationFailed(transaction, error);
    throw error;
  }
}

async function incrementDiscountUsage(transaction) {
  const discountId = transaction.metadata?.discountId;
  if (discountId) await Discount.findByIdAndUpdate(discountId, { $inc: { usedCount: 1 } });
}

async function activatePremiumFromTransaction(transaction) {
  const plan = await PremiumPlan.findById(transaction.metadata?.planId);
  if (!plan) throw new ApiError(404, 'Khong tim thay goi Premium');

  const role = transaction.metadata?.role || 'client';
  const accountType = transaction.metadata?.accountType || plan.code || premiumAccountTypeForRole(role);
  const startDate = new Date();
  const endDate = new Date(Date.now() + plan.durationDays * 86400000);

  await Subscription.updateMany({ userId: transaction.userId, status: 'active' }, { status: 'expired' });
  const subscription = await Subscription.create({
    userId: transaction.userId,
    planId: plan._id,
    accountType,
    startDate,
    endDate,
    status: 'active'
  });

  if (role === 'designer') {
    await DesignerProfile.findOneAndUpdate(
      { userId: transaction.userId },
      { userId: transaction.userId, accountType, premiumStatus: 'premium', premiumExpiresAt: endDate },
      { upsert: true, new: true }
    );
  } else {
    await ClientProfile.findOneAndUpdate(
      { userId: transaction.userId },
      { userId: transaction.userId, accountType, premiumStatus: 'premium', premiumExpiresAt: endDate },
      { upsert: true, new: true }
    );
  }

  await Notification.create({
    userId: transaction.userId,
    title: 'Tai khoan Premium da kich hoat',
    message: `${plan.name} co hieu luc den ${endDate.toLocaleDateString('vi-VN')}.`,
    type: 'premium',
    link: role === 'designer' ? '/designer/premium' : '/client/premium'
  });

  transaction.metadata = { ...transaction.metadata, subscriptionId: subscription._id };
  await transaction.save();
}

async function finalizePayosTransaction(transaction, payosData) {
  if (transaction.status === 'success') return transaction;

  transaction.status = 'success';
  transaction.metadata = {
    ...(transaction.metadata || {}),
    payosStatus: 'PAID',
    payosPaidAt: new Date(),
    payosData
  };
  await transaction.save();

  if (transaction.type === 'deposit') {
    await Wallet.findOneAndUpdate(
      { userId: transaction.userId },
      { $inc: { escrowBalance: transaction.amount, totalSpent: transaction.amount + transaction.platformFee } },
      { upsert: true }
    );
    await Project.findByIdAndUpdate(transaction.projectId, { status: 'escrow_funded' });
  }

  if (transaction.type === 'premium') await activatePremiumFromTransaction(transaction);

  await incrementDiscountUsage(transaction);
  return transaction;
}

async function applyPayosPaymentStatus(transaction, paymentData) {
  const status = String(paymentData?.status || '').toUpperCase();
  const paidByStatus = status === 'PAID';
  const paidByWebhook = paymentData?.code === '00' && Number(paymentData?.amount || 0) >= Number(transaction.amount || 0);

  if (paidByStatus || paidByWebhook) return finalizePayosTransaction(transaction, paymentData);

  if (['CANCELLED', 'EXPIRED'].includes(status)) {
    transaction.status = 'cancelled';
    transaction.metadata = { ...(transaction.metadata || {}), payosStatus: status, payosData: paymentData };
    await transaction.save();
  }

  return transaction;
}

export async function handlePayosPaymentWebhook(payload) {
  if (!payload?.data || !payload?.signature) throw new ApiError(400, 'Webhook payOS khong hop le');
  if (!verifyPayosPaymentSignature(payload.data, payload.signature)) throw new ApiError(400, 'Chu ky webhook payOS khong hop le');

  const transaction = await Transaction.findOne({ 'metadata.payosOrderCode': Number(payload.data.orderCode) });
  if (!transaction) return { received: true, ignored: true };

  await applyPayosPaymentStatus(transaction, payload.data);
  return { received: true, transactionId: transaction._id };
}

export async function syncPayosPayment({ orderCode, user }) {
  const transaction = await Transaction.findOne({ 'metadata.payosOrderCode': Number(orderCode) });
  if (!transaction) throw new ApiError(404, 'Khong tim thay giao dich payOS');
  if (!user.roles.includes('admin') && String(transaction.userId) !== String(user._id)) throw new ApiError(403, 'Ban khong co quyen xem giao dich nay');

  const payosResponse = await getPayosPaymentRequest(orderCode);
  await applyPayosPaymentStatus(transaction, payosResponse.data);
  return { transaction, payment: payosResponse.data };
}
