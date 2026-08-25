import { getAllDemands, createDemand, updateDemand, deleteDemand, getDemandById } from '../models/demandModel.js';
import { parseDemandText } from '../services/demandParser.js';

export const listDemands = async (req, res) => {
  try {
    const demands = await getAllDemands();
    return res.status(200).json(demands);
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
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'Thiếu họ tên hoặc SĐT' });
    }
    // Validate phone format
    const phoneRegex = /^[0-9+]{9,15}$/;
    const cleanPhone = String(phone).replace(/[^0-9+]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
    }
    // Validate prices
    if (req.body.min_price !== undefined && req.body.min_price < 0) {
      return res.status(400).json({ success: false, message: 'Giá tối thiểu không được âm' });
    }
    if (req.body.max_price !== undefined && req.body.max_price < 0) {
      return res.status(400).json({ success: false, message: 'Giá tối đa không được âm' });
    }
    if (req.body.min_price !== undefined && req.body.max_price !== undefined && req.body.min_price > req.body.max_price) {
      return res.status(400).json({ success: false, message: 'Giá tối thiểu không được lớn hơn giá tối đa' });
    }
    if (req.body.min_area !== undefined && req.body.min_area <= 0) {
      return res.status(400).json({ success: false, message: 'Diện tích phải lớn hơn 0' });
    }
    if (req.body.people_count !== undefined && req.body.people_count <= 0) {
      return res.status(400).json({ success: false, message: 'Số người phải lớn hơn 0' });
    }
    const demand = await createDemand(req.body);
    return res.status(201).json({ success: true, message: 'Gửi nhu cầu phòng thành công', data: demand });
  } catch (error) {
    console.error('[demands] create failed:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo nhu cầu', error: error.message });
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
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'Thiếu họ tên hoặc SĐT' });
    }
    const result = await updateDemand(req.params.id, req.body);
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
