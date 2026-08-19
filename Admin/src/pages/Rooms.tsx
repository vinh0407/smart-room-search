import { ChangeEvent, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Sparkles, Star, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage, getToken } from '../lib/api';
import type { Room, RoomFormData } from '../lib/types';
import { AMENITY_META, DISTRICTS, formatPrice } from '../lib/utils';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { usePolling } from '../lib/usePolling';

const emptyForm = (): RoomFormData => ({
  title: '',
  description: '',
  address: '',
  price: '',
  area: '',
  status: 'available',
  district: 'Quận 1',
  city: 'TP.HCM',
  maxPeople: '2',
  phone: '',
  zaloLink: '',
  electricity: '3500',
  water: '150000',
  internet: '100000',
  serviceFee: '200000',
  rating: '4.5',
  isFeatured: false,
  isNew: false,
  isCheap: false,
  images: '',
  amenities: [],
  lat: '',
  lng: '',
});

const formFromRoom = (r: Room): RoomFormData => ({
  title: r.title,
  description: r.description,
  address: r.address,
  price: String(r.price),
  area: String(r.area),
  status: r.status,
  district: r.district,
  city: r.city,
  maxPeople: String(r.maxPeople),
  phone: r.phone,
  zaloLink: r.zaloLink,
  electricity: String(r.electricity),
  water: String(r.water),
  internet: String(r.internet),
  serviceFee: String(r.serviceFee),
  rating: String(r.rating),
  isFeatured: r.isFeatured,
  isNew: r.isNew,
  isCheap: r.isCheap,
  images: (r.images || []).join('\n'),
  amenities: r.amenities || [],
  lat: r.lat != null ? String(r.lat) : '',
  lng: r.lng != null ? String(r.lng) : '',
});

const toPayload = (f: RoomFormData) => ({
  title: f.title.trim(),
  description: f.description.trim(),
  address: f.address.trim(),
  price: Number(f.price || 0),
  area: Number(f.area || 0),
  status: f.status,
  district: f.district,
  city: f.city,
  maxPeople: Number(f.maxPeople || 2),
  phone: f.phone.trim(),
  zaloLink: f.zaloLink.trim(),
  electricity: Number(f.electricity || 0),
  water: Number(f.water || 0),
  internet: Number(f.internet || 0),
  serviceFee: Number(f.serviceFee || 0),
  rating: Number(f.rating || 4.5),
  isFeatured: f.isFeatured,
  isNew: f.isNew,
  isCheap: f.isCheap,
  images: f.images
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean),
  amenities: f.amenities,
  lat: f.lat !== '' ? Number(f.lat) : undefined,
  lng: f.lng !== '' ? Number(f.lng) : undefined,
});

const STATUS_CYCLE: Room['status'][] = ['available', 'rented', 'maintenance'];

interface RoomsProps {
  rooms: Room[];
  tenants: { room_id: number; id: number }[];
  reload: () => void;
}

export default function Rooms({ rooms, tenants, reload }: RoomsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomFormData>(emptyForm());
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  usePolling(reload, 5000, !modalOpen);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q)
    );
  }, [rooms, search]);

  const set = <K extends keyof RoomFormData>(key: K, value: RoomFormData[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setForm(formFromRoom(room));
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.address.trim()) {
      toast.error('Vui lòng nhập tên và địa chỉ phòng');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/rooms/${editing.id}`, toPayload(form));
        toast.success('Đã cập nhật phòng');
      } else {
        await api.post('/rooms', toPayload(form));
        toast.success('Đã tạo phòng mới');
      }
      setModalOpen(false);
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (room: Room) => {
    if (!window.confirm(`Xóa phòng "${room.title}"?`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      toast.success('Đã xóa phòng');
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const toggleStatus = async (room: Room) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(room.status) + 1) % STATUS_CYCLE.length];
    setBusy(true);
    try {
      await api.put(`/rooms/${room.id}/status`, { status: next });
      if (next === 'rented') {
        const existing = tenants.find((t) => Number(t.room_id) === Number(room.id));
        if (!existing) {
          await api.post('/tenants', { room_id: Number(room.id) });
          toast.warning('Phòng đã thuê – vui lòng cập nhật thông tin khách thuê!');
        }
      } else if (next === 'available') {
        const roomTenants = tenants.filter((t) => Number(t.room_id) === Number(room.id));
        for (const tenant of roomTenants) {
          await api.delete(`/tenants/${tenant.id}?reason=${encodeURIComponent('Phòng chuyển về còn trống')}`);
        }
        toast.success('Phòng đã chuyển về còn trống và thông tin khách thuê đã được xóa');
      }
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const uploadImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => /^image\//.test(f.type));
    if (files.length === 0) {
      toast.error('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP, GIF...)');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const { data } = await api.post('/upload', formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const urls = data.urls || [];
      if (urls.length > 0) {
        const current = form.images
          .split(/[\n,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        set('images', [...current, ...urls].join('\n'));
        toast.success(`Đã tải lên ${urls.length} ảnh. Nhấn "Lưu phòng" để lưu.`);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const generateDescription = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/ai/room-description', {
        title: form.title,
        address: form.address,
        price: Number(form.price || 0),
        area: Number(form.area || 0),
        district: form.district,
        amenities: form.amenities.map((a) => AMENITY_META[a] || a),
      });
      set('description', data.description || '');
      toast.success('AI đã tạo mô tả!');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const geocode = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ address: form.address, district: form.district, city: form.city });
      const { data } = await api.get(`/geocode?${params.toString()}`);
      set('lat', data.lat);
      set('lng', data.lng);
      toast.success(data.display_name ? `Đã tìm tọa độ: ${data.display_name}` : 'Đã tìm tọa độ qua OpenStreetMap!');
    } catch (error) {
      toast.error(errorMessage(error) || 'Không tìm thấy tọa độ');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phòng..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Thêm phòng
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Phòng</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Diện tích</th>
              <th className="px-4 py-3">Quận</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đặc trưng</th>
              <th className="px-4 py-3">Đánh giá</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {r.images?.[0] ? (
                      <img src={r.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-slate-100" />
                    )}
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="max-w-[220px] truncate text-xs text-slate-500">{r.address}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">{formatPrice(r.price)}</td>
                <td className="px-4 py-3">{r.area} m²</td>
                <td className="px-4 py-3">{r.district}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleStatus(r)} title="Nhấn để đổi trạng thái" disabled={busy}>
                    <StatusBadge status={r.status} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.isFeatured && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Nổi bật</span>
                    )}
                    {r.isNew && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Mới</span>
                    )}
                    {r.isCheap && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Rẻ</span>
                    )}
                    {!r.isFeatured && !r.isNew && !r.isCheap && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <Star size={13} className="text-amber-400" />
                    {r.rating}
                  </span>
                </td>
                <td className="px-4 py-3">{r.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Không tìm thấy phòng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title={editing ? `Sửa phòng #${editing.id}` : 'Thêm phòng mới'} onClose={() => setModalOpen(false)} wide>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tên phòng *</label>
              <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Mô tả
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={busy}
                  className="ml-2 inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                >
                  <Sparkles size={11} />
                  AI viết mô tả
                </button>
              </label>
              <textarea
                rows={3}
                className={inputClass}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Địa chỉ *</label>
              <div className="flex gap-2">
                <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} />
                <button
                  type="button"
                  onClick={geocode}
                  disabled={busy}
                  className="shrink-0 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="flex items-center gap-1">
                    <MapPin size={13} />
                    Tọa độ
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giá (VNĐ/tháng) *</label>
              <input type="number" className={inputClass} value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Diện tích (m²)</label>
              <input type="number" className={inputClass} value={form.area} onChange={(e) => set('area', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Trạng thái</label>
              <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as RoomFormData['status'])}>
                <option value="available">Còn trống</option>
                <option value="rented">Đã thuê</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Quận</label>
              <select className={inputClass} value={form.district} onChange={(e) => set('district', e.target.value)}>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Thành phố</label>
              <input className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số người tối đa</label>
              <input type="number" className={inputClass} value={form.maxPeople} onChange={(e) => set('maxPeople', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">SĐT liên hệ</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Zalo link</label>
              <input className={inputClass} value={form.zaloLink} onChange={(e) => set('zaloLink', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tiền điện (VNĐ/kWh)</label>
              <input type="number" className={inputClass} value={form.electricity} onChange={(e) => set('electricity', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tiền nước (VNĐ/tháng)</label>
              <input type="number" className={inputClass} value={form.water} onChange={(e) => set('water', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Internet (VNĐ/tháng)</label>
              <input type="number" className={inputClass} value={form.internet} onChange={(e) => set('internet', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phí dịch vụ (VNĐ/tháng)</label>
              <input type="number" className={inputClass} value={form.serviceFee} onChange={(e) => set('serviceFee', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Đánh giá (0-5)</label>
              <input type="number" step="0.1" min="0" max="5" className={inputClass} value={form.rating} onChange={(e) => set('rating', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Latitude</label>
              <input className={inputClass} value={form.lat} onChange={(e) => set('lat', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Longitude</label>
              <input className={inputClass} value={form.lng} onChange={(e) => set('lng', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Đặc trưng</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
                  Nổi bật
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isNew} onChange={(e) => set('isNew', e.target.checked)} />
                  Mới
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isCheap} onChange={(e) => set('isCheap', e.target.checked)} />
                  Giá rẻ
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tiện ích</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Object.entries(AMENITY_META).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={form.amenities.includes(key)}
                      onChange={(e) =>
                        set(
                          'amenities',
                          e.target.checked
                            ? [...form.amenities, key]
                            : form.amenities.filter((a) => a !== key)
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Ảnh (mỗi URL một dòng)
                <label className="ml-2 cursor-pointer rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                  {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
                  <input type="file" accept="image/*" multiple hidden onChange={uploadImages} />
                </label>
              </label>
              <textarea
                rows={4}
                className={inputClass}
                value={form.images}
                onChange={(e) => set('images', e.target.value)}
                placeholder="https://res.cloudinary.com/.../smart-room/rooms/room_1.jpg"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images
                  .split(/[\n,;]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((url) => (
                    <img key={url} src={url} alt="" className="h-14 w-20 rounded-lg border border-slate-200 object-cover" />
                  ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'Đang lưu...' : 'Lưu phòng'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}