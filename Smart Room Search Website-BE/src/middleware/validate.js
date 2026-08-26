const isValidNumber = (value) =>
  value !== undefined && value !== null && value !== '' && !Number.isNaN(Number(value));

export const validateRoomPayload = (req, res, next) => {
  const { title, address, price, area, status } = req.body;
  const errors = [];

  if (title !== undefined && String(title).trim().length > 160) errors.push('Tên phòng quá dài');
  if (address !== undefined && String(address).trim().length > 500) errors.push('Địa chỉ quá dài');

  if (title === undefined || !String(title).trim()) {
    errors.push('Thiếu tên phòng');
  }
  if (address === undefined || !String(address).trim()) {
    errors.push('Thiếu địa chỉ');
  }
  if (!isValidNumber(price) || Number(price) < 0) {
    errors.push('Giá thuê không hợp lệ');
  }
  if (isValidNumber(price) && Number(price) > 1000000000) errors.push('Giá thuê vượt giới hạn');
  if (area !== undefined && area !== null && area !== '' && (!isValidNumber(area) || Number(area) < 0)) {
    errors.push('Diện tích không hợp lệ');
  }
  if (status !== undefined && !['available', 'rented', 'maintenance'].includes(status)) {
    errors.push('Trạng thái không hợp lệ');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join('; ') });
  }

  next();
};

export const validateRoomStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status || !['available', 'rented', 'maintenance'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }

  next();
};

export const validateTenantPayload = (req, res, next) => {
  const { room_id } = req.body;
  const errors = [];

  if (!isValidNumber(room_id)) errors.push('Thiếu mã phòng');
  if (isValidNumber(room_id) && Number(room_id) <= 0) errors.push('Mã phòng không hợp lệ');

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join('; ') });
  }

  next();
};
