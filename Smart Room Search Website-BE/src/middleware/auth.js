import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/auth.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
  }
  next();
};

export const optionalAuthenticate = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
};
