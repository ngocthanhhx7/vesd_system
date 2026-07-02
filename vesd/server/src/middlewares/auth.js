import { ApiError } from '../utils/apiError.js';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/index.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Vui lòng đăng nhập');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || user.status !== 'active') throw new ApiError(401, 'Tài khoản không hợp lệ');
    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Token không hợp lệ'));
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.some((role) => req.user.roles.includes(role))) {
    return next(new ApiError(403, 'Bạn không có quyền thực hiện hành động này'));
  }
  next();
};

