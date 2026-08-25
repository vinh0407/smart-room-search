import { isMockMode } from '../config/db.js';
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  bulkDeleteRooms,
  updateRoomStatus,
  getRoomStats,
  incrementRoomViews,
  incrementRoomContacts,
  roomsLastModified,
} from '../models/roomModel.js';

export const listRooms = async (req, res) => {
  try {
    const { status, district, priceMin, priceMax, areaMin, areaMax, search } = req.query;
    const rooms = await getAllRooms({ status, district, priceMin, priceMax, areaMin, areaMax, search });
    res.set('X-Last-Modified', String(roomsLastModified));
    return res.status(200).json(rooms);
  } catch (error) {
    console.error('[rooms] list failed:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách phòng' });
  }
};

export const getRoomsVersion = async (req, res) => {
  return res.status(200).json({ lastModified: roomsLastModified });
};

export const getRoom = async (req, res) => {
  try {
    const room = await getRoomById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    return res.status(200).json(room);
  } catch (error) {
    console.error('[rooms] get failed:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy phòng' });
  }
};

export const addRoom = async (req, res) => {
  try {
    const roomPayload = {
      ...req.body,
      images: Array.isArray(req.body.images) ? req.body.images : [],
    };

    const newRoom = await createRoom(roomPayload);
    return res.status(201).json(newRoom);
  } catch (error) {
    console.error('[rooms] create failed:', error);
    return res.status(500).json({ message: 'Lỗi khi tạo phòng' });
  }
};

export const editRoom = async (req, res) => {
  try {
    const updatedRoom = await updateRoom(req.params.id, req.body);

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    return res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('[rooms] update failed:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật phòng' });
  }
};

export const removeRoom = async (req, res) => {
  try {
    const removed = await deleteRoom(req.params.id);

    if (!removed) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    return res.status(200).json({ message: 'Xóa phòng thành công' });
  } catch (error) {
    console.error('[rooms] delete failed:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa phòng' });
  }
};

export const bulkRemoveRooms = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID phòng cần xóa không hợp lệ' });
    }
    const result = await bulkDeleteRooms(ids);
    return res.status(200).json({ message: `Đã xóa ${result.count} phòng thành công`, count: result.count });
  } catch (error) {
    console.error('[rooms] bulk delete failed:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa nhiều phòng' });
  }
};

export const changeRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const updatedRoom = await updateRoomStatus(req.params.id, status);

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    return res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('[rooms] status update failed:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái phòng' });
  }
};

export const stats = async (req, res) => {
  try {
    const statsData = await getRoomStats();
    return res.status(200).json(statsData);
  } catch (error) {
    console.error('[rooms] stats failed:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy thống kê' });
  }
};

export const trackView = async (req, res) => {
  try {
    const tracked = await incrementRoomViews(req.params.id);
    if (!tracked) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[rooms] track view failed:', error);
    return res.status(500).json({ message: 'Lỗi khi ghi nhận lượt xem' });
  }
};

export const trackContact = async (req, res) => {
  try {
    const tracked = await incrementRoomContacts(req.params.id);
    if (!tracked) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[rooms] track contact failed:', error);
    return res.status(500).json({ message: 'Lỗi khi ghi nhận liên hệ' });
  }
};
