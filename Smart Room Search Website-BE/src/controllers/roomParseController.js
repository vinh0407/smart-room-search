import { parseRoomsText } from '../utils/roomParser.js';
import { getAllRooms, createRoom, updateRoom } from '../models/roomModel.js';

const isDuplicate = (existing, room) =>
  existing.some(
    (r) =>
      r.title.trim().toLowerCase() === String(room.title || '').trim().toLowerCase() &&
      r.address.trim().toLowerCase() === String(room.address || '').trim().toLowerCase()
  );

export const parseRooms = async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

    if (!text) {
      return res.status(400).json({ message: 'Thiếu nội dung văn bản cần nhập liệu' });
    }

    const { rooms, updates, warnings, errors } = parseRoomsText(text);
    const existing = await getAllRooms({});
    const created = [];
    const skipped = [];

    for (const room of rooms) {
      if (isDuplicate(existing, room)) {
        skipped.push(room.title);
        continue;
      }
      try {
        const saved = await createRoom(room);
        created.push({ id: saved.id, title: saved.title });
      } catch (error) {
        console.error('[rooms/parse] create failed:', room.title, error);
        errors.push(`Không tạo được phòng '${room.title}'`);
      }
    }

    const appliedUpdates = [];
    for (const update of updates) {
      try {
        const updated = await updateRoom(update.room_id, update.fields);
        if (!updated) {
          errors.push(`Không tìm thấy phòng ${update.room_id} để cập nhật`);
          continue;
        }
        appliedUpdates.push({ room_id: update.room_id, fields: update.fields });
      } catch (error) {
        console.error('[rooms/parse] update failed:', update.room_id, error);
        errors.push(`Không cập nhật được phòng ${update.room_id}`);
      }
    }

    return res.status(200).json({
      summary: {
        parsedRooms: rooms.length,
        created: created.length,
        skippedDuplicates: skipped.length,
        updatesApplied: appliedUpdates.length,
      },
      created,
      skipped,
      updates: appliedUpdates,
      warnings,
      errors,
    });
  } catch (error) {
    console.error('[rooms/parse] failed:', error);
    return res.status(500).json({ message: 'Lỗi khi nhập liệu văn bản' });
  }
};