import { getAllTenants, createTenant, updateTenant, deleteTenant } from '../models/tenantModel.js';
import { getAllTenantHistory } from '../models/tenantHistoryModel.js';

export const listTenants = async (req, res) => {
  try {
    const tenants = await getAllTenants();
    return res.status(200).json(tenants);
  } catch (error) {
    console.error('[tenants] list failed:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách khách thuê' });
  }
};

export const addTenant = async (req, res) => {
  try {
    const tenant = await createTenant(req.body);
    return res.status(201).json(tenant);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    console.error('[tenants] create failed:', error);
    return res.status(500).json({ message: 'Lỗi khi tạo khách thuê mới' });
  }
};

export const editTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTenant(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy khách thuê' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    console.error('[tenants] update failed:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật khách thuê' });
  }
};

export const removeTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.query.reason || req.body?.reason || '').trim();
    const deletedTenant = await deleteTenant(id, reason);
    if (!deletedTenant) {
      return res.status(404).json({ message: 'Không tìm thấy khách thuê' });
    }
    return res.status(200).json({ message: 'Xóa khách thuê thành công' });
  } catch (error) {
    console.error('[tenants] delete failed:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa khách thuê' });
  }
};

export const listTenantHistory = async (req, res) => {
  try {
    const history = await getAllTenantHistory();
    return res.status(200).json(history);
  } catch (error) {
    console.error('[tenant-history] list failed:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy lịch sử khách thuê' });
  }
};
