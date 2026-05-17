import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User, Wallet, ClientProfile, DesignerProfile } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { signToken } from '../utils/token.js';
import { env } from '../config/env.js';

const googleClient = new OAuth2Client(env.googleClientId);

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

export async function googleLogin(credential) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new ApiError(400, 'Khong the xac thuc tu Google');

    const email = payload.email.toLowerCase();
    const name = payload.name || 'Google User';
    const avatar = payload.picture;

    let user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      // Create new user if not exists
      // Generate a random strong password for google users to satisfy required schema
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10) + 'Aa1@';
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      
      user = await User.create({ 
        name, 
        email, 
        passwordHash, 
        roles: ['client'],
        avatar,
        emailVerified: Boolean(payload.email_verified),
        status: 'active'
      });
      await Wallet.create({ userId: user._id });
      await ClientProfile.create({ userId: user._id });
    } else if (!user.avatar && avatar) {
      // Update avatar if missing
      user.avatar = avatar;
      user.emailVerified = user.emailVerified || Boolean(payload.email_verified);
      await user.save();
    }

    if (user.status !== 'active') throw new ApiError(403, 'Tai khoan dang bi khoa');

    return { user: sanitizeUser(user), token: signToken(user) };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Google Auth Error:', error);
    throw new ApiError(401, 'Xac thuc Google that bai');
  }
}
