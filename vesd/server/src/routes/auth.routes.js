import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler, ApiError } from '../utils/apiError.js';
import { loginUser, registerUser, googleLogin } from '../services/authService.js';
import { requireAuth } from '../middlewares/auth.js';
import { sendEmail } from '../services/emailService.js';
import { User } from '../models/index.js';
import { env } from '../config/env.js';

export const authRoutes = Router();

authRoutes.post('/register', asyncHandler(async (req, res) => res.status(201).json(await registerUser(req.body))));
authRoutes.post('/login', asyncHandler(async (req, res) => res.json(await loginUser(req.body))));
authRoutes.post('/google', asyncHandler(async (req, res) => res.json(await googleLogin(req.body.credential))));
authRoutes.post('/logout', (_req, res) => res.json({ message: 'Dang xuat thanh cong' }));
authRoutes.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
authRoutes.post('/forgot-password', (_req, res) => res.json({ message: 'Email khoi phuc mat khau da duoc tao mock' }));
authRoutes.post('/reset-password', (_req, res) => res.json({ message: 'Mat khau da duoc cap nhat mock' }));

// ── Email Verification ──
authRoutes.post('/send-verification-email', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'Khong tim thay nguoi dung');
  if (user.emailVerified) throw new ApiError(400, 'Email da duoc xac thuc');

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, purpose: 'email-verification' },
    env.jwtSecret,
    { expiresIn: '24h' }
  );

  const verifyUrl = `/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Xác thực email tài khoản VESD',
    title: 'Xác thực email của bạn',
    body: `<h2>Xin chào ${user.name},</h2><p>Vui lòng nhấn nút bên dưới để xác thực địa chỉ email của bạn. Link có hiệu lực trong 24 giờ.</p>`,
    actionUrl: verifyUrl,
    actionLabel: 'Xác thực email'
  });

  res.json({ message: 'Email xac thuc da duoc gui' });
}));

authRoutes.get('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Thieu token xac thuc');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(400, 'Token khong hop le hoac da het han');
  }

  if (payload.purpose !== 'email-verification') throw new ApiError(400, 'Token khong hop le');

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(404, 'Khong tim thay nguoi dung');
  if (user.emailVerified) {
    return res.json({ message: 'Email da duoc xac thuc truoc do', alreadyVerified: true });
  }

  user.emailVerified = true;
  await user.save();
  res.json({ message: 'Email da duoc xac thuc thanh cong', verified: true });
}));
