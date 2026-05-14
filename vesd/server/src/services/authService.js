import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Wallet, ClientProfile, DesignerProfile } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { signToken } from '../utils/token.js';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['client', 'designer']).default('client')
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function registerUser(payload) {
  const data = registerSchema.parse(payload);
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new ApiError(409, 'Email da duoc su dung');
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await User.create({ name: data.name, email: data.email, passwordHash, roles: [data.role] });
  await Wallet.create({ userId: user._id });
  if (data.role === 'client') await ClientProfile.create({ userId: user._id });
  if (data.role === 'designer') await DesignerProfile.create({ userId: user._id, title: 'Designer moi', slug: `${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` });
  return { user: sanitizeUser(user), token: signToken(user) };
}

export async function loginUser(payload) {
  const data = loginSchema.parse(payload);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Email hoac mat khau khong dung');
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Email hoac mat khau khong dung');
  if (user.status !== 'active') throw new ApiError(403, 'Tai khoan dang bi khoa');
  return { user: sanitizeUser(user), token: signToken(user) };
}

export function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}

