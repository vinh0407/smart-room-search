import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { isMockMode } from '../config/db.js';
import { getUserByUsername, createUser } from '../models/userModel.js';
import { getJwtSecret } from '../config/auth.js';

const signToken = (user) => jwt.sign({ id: user.id, username: user.username, role: user.role }, getJwtSecret(), { expiresIn: '8h' });

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu username hoặc password' });
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const token = signToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[auth] login failed:', error);
    return res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
};

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu username hoặc password' });
    }

    const existingUser = await getUserByUsername(username);

    if (existingUser) {
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await createUser({ username, password_hash: passwordHash, role: 'admin' });

    return res.status(201).json({
      message: 'Tạo tài khoản thành công',
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    console.error('[auth] register failed:', error);
    return res.status(500).json({ message: 'Lỗi server khi tạo tài khoản' });
  }
};

export const me = async (req, res) => {
  return res.status(200).json({ user: req.user });
};
