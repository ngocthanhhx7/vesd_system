import { Discount } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

export function calculateDiscountAmount(discount, amount) {
  if (!discount || amount <= 0) return 0;
  const raw = discount.discountType === 'fixed' ? discount.value : Math.round(amount * (discount.value / 100));
  const capped = discount.maxDiscount ? Math.min(raw, discount.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, amount));
}

export async function validateDiscount({ code, amount, appliesTo = 'all', role = 'client' }) {
  if (!code) return { discount: null, discountAmount: 0, finalAmount: amount };

  const discount = await Discount.findOne({ code: String(code).toUpperCase().trim(), isActive: true });
  if (!discount) throw new ApiError(404, 'Ma giam gia khong hop le');

  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) throw new ApiError(400, 'Ma giam gia chua bat dau');
  if (discount.endsAt && discount.endsAt < now) throw new ApiError(400, 'Ma giam gia da het han');
  if (discount.usageLimit && discount.usedCount >= discount.usageLimit) throw new ApiError(400, 'Ma giam gia da het luot su dung');
  if (discount.minOrderAmount && amount < discount.minOrderAmount) throw new ApiError(400, 'Gia tri don hang chua dat muc toi thieu');
  if (discount.appliesTo !== 'all' && discount.appliesTo !== appliesTo) throw new ApiError(400, 'Ma giam gia khong ap dung cho tinh nang nay');
  if (discount.roleTarget !== 'both' && discount.roleTarget !== role) throw new ApiError(400, 'Ma giam gia khong ap dung cho vai tro hien tai');

  const discountAmount = calculateDiscountAmount(discount, amount);
  return { discount, discountAmount, finalAmount: Math.max(amount - discountAmount, 0) };
}

