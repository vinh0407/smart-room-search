const attempts = new Map();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

export const loginRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = attempts.get(key);
  if (!record || now - record.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
    return next();
  }

  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 10 phút' });
  }

  next();
};