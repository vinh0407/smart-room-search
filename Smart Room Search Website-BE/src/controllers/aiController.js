const AMENITY_LABELS = {
  ac: 'máy lạnh',
  private_wc: 'WC riêng',
  washing_machine: 'máy giặt',
  kitchen: 'bếp',
  balcony: 'ban công',
  loft: 'gác lửng',
  parking: 'chỗ để xe',
  pet_friendly: 'được nuôi thú cưng',
  wifi: 'wifi miễn phí',
};

const TEMPLATES = [
  (d) => `Phòng trọ ${d.title} tại ${d.address}${d.district ? `, ${d.district}` : ''} với diện tích ${d.area || '?'} m². Giá thuê chỉ ${d.priceText}/tháng${d.amenList ? `, đầy đủ tiện nghi: ${d.amenList}` : ''}. Vị trí thuận tiện di chuyển, phù hợp cho sinh viên và người đi làm.`,
  (d) => `Cho thuê ${d.title} – ${d.area || '?'} m² tại ${d.address}${d.district ? ` (${d.district})` : ''}. Giá ${d.priceText}/tháng.${d.amenList ? ` Tiện ích nổi bật: ${d.amenList}.` : ''} Liên hệ ngay để xem phòng!`,
  (d) => `${d.title} – phòng trọ ${d.area || '?'} m² giá rẻ tại ${d.address}${d.district ? `, ${d.district}` : ''}. Chỉ ${d.priceText}/tháng${d.amenList ? `, trang bị sẵn ${d.amenList}` : ''}. An ninh tốt, khu vực yên tĩnh, gần chợ và trường học.`,
];

export const generateRoomDescription = async (req, res) => {
  try {
    const { title, address, price, area, amenities, district } = req.body;

    const priceText = price
      ? Number(price).toLocaleString('vi-VN') + ' VNĐ'
      : '?';

    const amenList = Array.isArray(amenities) && amenities.length > 0
      ? amenities.map((a) => AMENITY_LABELS[a] || a).join(', ')
      : '';

    const data = { title: title || 'Phòng trọ', address: address || '', district, area, priceText, amenList };

    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const description = template(data);

    return res.status(200).json({ description });
  } catch (error) {
    console.error('[AI] error:', error);
    return res.status(500).json({ message: 'Lỗi khi tạo mô tả' });
  }
};
