export const getJwtSecret = (source = process.env) => {
  const secret = String(source?.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET chưa được cấu hình');
  }
  return secret;
};
