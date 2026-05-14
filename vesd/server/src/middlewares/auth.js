import { ApiError } from '../utils/apiError.js';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/index.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Vui long dang nhap');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || user.status !== 'active') throw new ApiError(401, 'Tai khoan khong hop le');
    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Token khong hop le'));
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.some((role) => req.user.roles.includes(role))) {
    return next(new ApiError(403, 'Ban khong co quyen thuc hien hanh dong nay'));
  }
  next();
};

