import { Router } from 'express';
import { asyncHandler } from '../utils/apiError.js';
import { loginUser, registerUser } from '../services/authService.js';
import { requireAuth } from '../middlewares/auth.js';

export const authRoutes = Router();

authRoutes.post('/register', asyncHandler(async (req, res) => res.status(201).json(await registerUser(req.body))));
authRoutes.post('/login', asyncHandler(async (req, res) => res.json(await loginUser(req.body))));
authRoutes.post('/logout', (_req, res) => res.json({ message: 'Dang xuat thanh cong' }));
authRoutes.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
authRoutes.post('/forgot-password', (_req, res) => res.json({ message: 'Email khoi phuc mat khau da duoc tao mock' }));
authRoutes.post('/reset-password', (_req, res) => res.json({ message: 'Mat khau da duoc cap nhat mock' }));

