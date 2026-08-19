export const DISTRICTS = [
  'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
  'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh', 'Gò Vấp', 'Tân Bình',
  'Tân Phú', 'Phú Nhuận', 'Bình Tân', 'Thủ Đức',
  'Bình Chánh', 'Cần Giờ', 'Củ Chi', 'Hóc Môn', 'Nhà Bè',
];

export const AMENITY_META: Record<string, string> = {
  ac: 'Máy lạnh',
  private_wc: 'WC riêng',
  washing_machine: 'Máy giặt',
  kitchen: 'Bếp',
  balcony: 'Ban công',
  loft: 'Gác lửng',
  parking: 'Để xe',
  ev_charging: 'Sạc xe điện',
  pet_friendly: 'Nuôi thú',
  wifi: 'Wifi',
};

export const STATUS_LABEL: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã thuê',
  maintenance: 'Bảo trì',
};

export const STATUS_COLOR: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  rented: 'bg-rose-100 text-rose-700',
  maintenance: 'bg-amber-100 text-amber-700',
};

export const formatPrice = (value: number) =>
  Number(value || 0).toLocaleString('vi-VN') + ' đ';

export const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = String(value).slice(0, 10);
  return d.split('-').reverse().join('/');
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  return String(value).slice(0, 16).replace('T', ' ');
};

export const parseList = (value: string) =>
  String(value || '')
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);