import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  const error = new Error(`Khong tim thay ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || 500;
  const payload = {
    message: error.message || 'Loi he thong',
    details: error.details || undefined
  };
  if (env.nodeEnv !== 'production') payload.stack = error.stack;
  res.status(status).json(payload);
}

