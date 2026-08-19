import { geocodeLocation } from '../utils/geocodeService.js';

/** Tra tọa độ miễn phí qua OpenStreetMap Nominatim — không cần API key. */
export const geocodeAddress = async (req, res) => {
  const address = String(req.query.address || '').trim();
  const district = String(req.query.district || '').trim();
  const city = String(req.query.city || 'TP.HCM').trim();

  if (!address) {
    return res.status(400).json({ message: 'Thiếu địa chỉ' });
  }

  try {
    const result = await geocodeLocation(address, district, city);
    if (!result) {
      return res.status(404).json({
        message: 'Không tìm thấy tọa độ. Thử bổ sung quận/huyện hoặc địa chỉ chi tiết hơn.',
      });
    }

    return res.status(200).json({
      ...result,
      provider: 'osm',
    });
  } catch (error) {
    console.error('[Geocode] OSM error:', error);
    return res.status(500).json({ message: 'Lỗi khi tra cứu tọa độ' });
  }
};
