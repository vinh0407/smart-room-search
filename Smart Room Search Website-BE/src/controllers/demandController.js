import { getAllDemands, createDemand, updateDemand, deleteDemand, getDemandById } from '../models/demandModel.js';
import { parseDemandText } from '../services/demandParser.js';

const publicDemand = (demand) => ({
  id: demand.id,
  full_name: demand.full_name || 'Người tìm phòng',
  district: demand.district || null,
  max_price: Number(demand.max_price || 0),
  note: demand.note || null,
  created_at: demand.created_at || null,
});

const normalizeDemand = (body) => {
  const phone = String(body.phone || '').replace(/\D/g, '');
  const numeric = (value, fallback = 0) => value === undefined || value === '' ? fallback : Number(value);
  return {
    full_name: String(body.full_name || '').trim().slice(0, 120),
    phone,
    gender: body.gender ? String(body.gender).trim().slice(0, 40) : null,
    district: body.district ? String(body.district).trim().slice(0, 120) : null,
    min_price: numeric(body.min_price),
    max_price: numeric(body.max_price),
    min_area: numeric(body.min_area),
    people_count: numeric(body.people_count, 1),
    note: body.note ? String(body.note).trim().slice(0, 2000) : '',
  };
};

const validateDemand = (demand) => {
  if (!demand.full_name || !demand.phone) return 'Thiếu họ tên hoặc SĐT';
  if (!/^\d{9,15}$/.test(demand.phone)) return 'Số điện thoại không hợp lệ';
  if (![demand.min_price, demand.max_price, demand.min_area, demand.people_count].every(Number.isFinite)) return 'Thông tin số không hợp lệ';
  if (demand.min_price < 0 || demand.max_price < 0) return 'Giá không được âm';
  if (demand.max_price > 0 && demand.min_price > demand.max_price) return 'Giá tối thiểu không được lớn hơn giá tối đa';
  if (demand.min_area < 0 || demand.people_count <= 0 || !Number.isInteger(demand.people_count)) return 'Thông tin diện tích hoặc số người không hợp lệ';
  return null;
};

export const listDemands = async (req, res) => {
  try {
    const demands = await getAllDemands();
    const result = req.user?.role === 'admin' ? demands : demands.map(publicDemand);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[demands] list failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách nhu cầu' });
  }
};

export const getDemand = async (req, res) => {
  try {
    const demand = await getDemandById(req.params.id);
    if (!demand) return res.status(404).json({ success: false, message: 'Không tìm thấy nhu cầu' });
    return res.status(200).json({ success: true, data: demand });
  } catch (error) {
    console.error('[demands] get failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy nhu cầu' });
  }
};

export const addDemand = async (req, res) => {
  try {
    const payload = normalizeDemand(req.body);
    const validationError = validateDemand(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const demand = await createDemand(payload);
    return res.status(201).json({ success: true, message: 'Gửi nhu cầu phòng thành công', data: demand });
  } catch (error) {
    console.error('[demands] create failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo nhu cầu' });
  }
};

export const removeDemand = async (req, res) => {
  try {
    const result = await deleteDemand(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    return res.status(200).json({ success: true, message: 'Đã xóa' });
  } catch (error) {
    console.error('[demands] delete failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa nhu cầu' });
  }
};

export const editDemand = async (req, res) => {
  try {
    const payload = normalizeDemand(req.body);
    const validationError = validateDemand(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const result = await updateDemand(req.params.id, payload);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[demands] update failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật nhu cầu' });
  }
};

export const parseDemand = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'Nội dung văn bản không hợp lệ' });
    }
    const result = parseDemandText(text);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json({ success: true, message: 'Phân tích thành công', data: result.data });
  } catch (error) {
    console.error('[demands] parse failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi phân tích nhu cầu' });
  }
};
