import { getAllDemands, createDemand, updateDemand, deleteDemand } from '../models/demandModel.js';

export const listDemands = async (req, res) => {
  try {
    const demands = await getAllDemands();
    return res.status(200).json(demands);
  } catch (error) {
    console.error('[demands] list failed:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách nhu cầu' });
  }
};

export const addDemand = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ message: 'Thiếu họ tên hoặc SĐT' });
    }
    const demand = await createDemand(req.body);
    return res.status(201).json(demand);
  } catch (error) {
    console.error('[demands] create failed:', error);
    return res.status(500).json({ message: 'Lỗi khi tạo nhu cầu' });
  }
};

export const removeDemand = async (req, res) => {
  try {
    const result = await deleteDemand(req.params.id);
    if (!result) return res.status(404).json({ message: 'Không tìm thấy' });
    return res.status(200).json({ message: 'Đã xóa' });
  } catch (error) {
    console.error('[demands] delete failed:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa nhu cầu' });
  }
};

export const editDemand = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ message: 'Thiếu họ tên hoặc SĐT' });
    }
    const result = await updateDemand(req.params.id, req.body);
    if (!result) return res.status(404).json({ message: 'Không tìm thấy' });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[demands] update failed:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật nhu cầu' });
  }
};
