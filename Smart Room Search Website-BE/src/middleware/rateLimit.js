const attempts = new Map();

const createRateLimit = (windowMs, maxAttempts, message) => (req, res, next) => {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.first > windowMs) {
    attempts.set(key, { first: now, count: 1 });
    return next();
  }
  record.count += 1;
  if (record.count > maxAttempts) return res.status(429).json({ message });
  return next();
};

export const loginRateLimit = createRateLimit(10 * 60 * 1000, 20, 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 10 phút');
export const demandRateLimit = createRateLimit(10 * 60 * 1000, 10, 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau 10 phút');
export const trackingRateLimit = createRateLimit(60 * 1000, 60, 'Quá nhiều lượt thao tác, vui lòng thử lại sau một phút');
