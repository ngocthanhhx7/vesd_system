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
  if (!discount) throw new ApiError(404, 'Mã giảm giá không hợp lệ');

  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) throw new ApiError(400, 'Mã giảm giá chưa bắt đầu');
  if (discount.endsAt && discount.endsAt < now) throw new ApiError(400, 'Mã giảm giá đã hết hạn');
  if (discount.usageLimit && discount.usedCount >= discount.usageLimit) throw new ApiError(400, 'Mã giảm giá đã hết lượt sử dụng');
  if (discount.minOrderAmount && amount < discount.minOrderAmount) throw new ApiError(400, 'Giá trị đơn hàng chưa đạt mức tối thiểu');
  if (discount.appliesTo !== 'all' && discount.appliesTo !== appliesTo) throw new ApiError(400, 'Mã giảm giá không áp dụng cho tính năng này');
  if (discount.roleTarget !== 'both' && discount.roleTarget !== role) throw new ApiError(400, 'Mã giảm giá không áp dụng cho vai trò hiện tại');

  const discountAmount = calculateDiscountAmount(discount, amount);
  return { discount, discountAmount, finalAmount: Math.max(amount - discountAmount, 0) };
}

