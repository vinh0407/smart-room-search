import { ChangeEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  FileText,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Room, RoomFormData } from '../lib/types';
import { AMENITY_META, DISTRICTS, formatPrice } from '../lib/utils';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { usePolling } from '../lib/usePolling';

export const STANDARD_ROOM_TEMPLATE = `Phòng P.102 - 3.500.000đ/tháng
Địa chỉ: 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3
Diện tích: 25m², ở tối đa 2 người
Điện 3.800đ/kWh, nước 100.000đ/người, xe 100k/tháng
Tiện ích: máy lạnh, máy giặt, gác lửng, tủ quần áo, khóa vân tay, wifi
Liên hệ SĐT/Zalo: 0901234567. Tình trạng: còn trống.
Mô tả: Phòng mới sạch sẽ thoáng mát, giờ giấc tự do, không chung chủ.`;

const SAMPLE_TEXT_MULTI = `Phòng A201, A202 - 3.800.000đ/tháng
Địa chỉ: 158/7 Hoàng Hoa Thám, Phường 12, Tân Bình
Diện tích: 25m², ở tối đa 2 người, ban công thoáng mát
Điện 3.800đ/kWh, nước 100.000đ/người, xe 100k/tháng
Tiện nghi: máy lạnh, wifi, gác lửng, tủ quần áo, khóa vân tay, camera
Liên hệ SĐT/Zalo: 0901234567. Tình trạng: còn trống.

Phòng B305 - 4.5 triệu/tháng
Địa chỉ: 75/7 Quang Trung, Phường 8, Gò Vấp, TP.HCM
Diện tích: 30m², tối đa 3 người
Điện 3.500đ/kWh, nước 80k/người, wifi miễn phí
Tiện ích: máy giặt, thang máy, bảo vệ 24/7, máy lạnh, tủ lạnh
SĐT: 0987654321. Tình trạng: còn trống.`;

const SAMPLE_TEXT_SINGLE = `Phòng trọ cao cấp P.102 tại 235 Lê Văn Sỹ, Quận 3. Giá 4tr2/tháng, diện tích 28m2, ở tối đa 2 người. Điện 4.000đ/kwh, nước 120k/người, xe 120k. Đầy đủ tiện nghi: máy lạnh, máy giặt, tủ lạnh, bếp, wifi, khóa vân tay. SĐT: 0938123456 (Zalo). Phòng trống dọn vào ngay.`;

const emptyForm = (): RoomFormData => ({
  title: '',
  description: '',
  address: '',
  price: '3500000',
  area: '25',
  status: 'available',
  district: 'Quận 1',
  city: 'TP.HCM',
  maxPeople: '2',
  phone: '0901234567',
  zaloLink: 'https://zalo.me/0901234567',
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
  title: r.title || '',
  description: r.description || '',
  address: r.address || '',
  price: String(r.price != null ? r.price : ''),
  area: String(r.area != null ? r.area : ''),
  status: r.status || 'available',
  district: r.district || 'Quận 1',
  city: r.city || 'TP.HCM',
  maxPeople: String(r.maxPeople != null ? r.maxPeople : 2),
  phone: r.phone || '0901234567',
  zaloLink: r.zaloLink || '',
  electricity: String(r.electricity != null ? r.electricity : 3500),
  water: String(r.water != null ? r.water : 150000),
  internet: String(r.internet != null ? r.internet : 100000),
  serviceFee: String(r.serviceFee != null ? r.serviceFee : 200000),
  rating: String(r.rating != null ? r.rating : 4.5),
  isFeatured: Boolean(r.isFeatured),
  isNew: Boolean(r.isNew),
  isCheap: Boolean(r.isCheap),
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
  status: f.status || 'available',
  district: f.district || 'Quận 1',
  city: f.city || 'TP.HCM',
  maxPeople: Number(f.maxPeople || 2),
  phone: f.phone.trim() || '0901234567',
  zaloLink: f.zaloLink.trim() || (f.phone.trim() ? `https://zalo.me/${f.phone.trim()}` : 'https://zalo.me/0901234567'),
  electricity: Number(f.electricity || 0),
  water: Number(f.water || 0),
  internet: Number(f.internet || 0),
  serviceFee: Number(f.serviceFee || 0),
  rating: Number(f.rating || 4.5),
  isFeatured: Boolean(f.isFeatured),
  isNew: Boolean(f.isNew),
  isCheap: Boolean(f.isCheap),
  images: f.images
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean),
  amenities: f.amenities || [],
  lat: f.lat !== '' && !isNaN(Number(f.lat)) ? Number(f.lat) : undefined,
  lng: f.lng !== '' && !isNaN(Number(f.lng)) ? Number(f.lng) : undefined,
});

const STATUS_CYCLE: Room['status'][] = ['available', 'rented', 'maintenance'];

interface ParsedRoomItem {
  title: string;
  description: string;
  address: string;
  price: number;
  area: number | null;
  images: string[];
  status: 'available' | 'rented' | 'maintenance';
  electricity: number | null;
  water: number | null;
  internet: number | null;
  serviceFee: number | null;
  maxPeople: number | null;
  district: string;
  city: string;
  lat: number | null;
  lng: number | null;
  amenities: string[];
  phone: string;
  zaloLink: string;
  isDuplicate?: boolean;
}

interface ParseResult {
  summary: {
    parsedRooms: number;
    duplicatesCount?: number;
    updatesCount?: number;
  };
  rooms: ParsedRoomItem[];
  updates: Array<{ room_id: number; fields: Record<string, unknown> }>;
  warnings: string[];
  errors: Array<string | { block: number; text: string; errors: string[] }>;
}

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

  // Table row selection state for bulk actions
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<number>>(new Set());

  // Text Parser Modal States
  const [parseModalOpen, setParseModalOpen] = useState(false);
  const [parseInputText, setParseInputText] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseImporting, setParseImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedRoomIndexes, setSelectedRoomIndexes] = useState<Set<number>>(new Set());

  // Quick parser inside single Room Modal
  const [showSingleQuickParse, setShowSingleQuickParse] = useState(false);
  const [singleQuickText, setSingleQuickText] = useState('');
  const [singleQuickBusy, setSingleQuickBusy] = useState(false);

  usePolling(reload, 5000, !modalOpen && !parseModalOpen);

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

  const copyStandardTemplate = async () => {
    try {
      await navigator.clipboard.writeText(STANDARD_ROOM_TEMPLATE);
      toast.success('📋 Đã sao chép mẫu khuôn tin đăng vào Clipboard! Bạn có thể dán ra chỉnh sửa.');
    } catch {
      toast.error('Không thể sao chép tự động, vui lòng chọn dán trực tiếp');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowSingleQuickParse(false);
    setSingleQuickText('');
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setForm(formFromRoom(room));
    setShowSingleQuickParse(false);
    setSingleQuickText('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tên phòng');
      return;
    }
    if (!form.address.trim()) {
      toast.error('Vui lòng nhập địa chỉ phòng');
      return;
    }
    if (!form.price || Number(form.price) < 0) {
      toast.error('Vui lòng nhập giá phòng hợp lệ');
      return;
    }

    setBusy(true);
    try {
      const payload = toPayload(form);
      if (editing) {
        await api.put(`/rooms/${editing.id}`, payload);
        toast.success('Đã cập nhật thông tin phòng thành công!');
      } else {
        await api.post('/rooms', payload);
        toast.success('Đã tạo phòng mới thành công!');
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
      setSelectedRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(room.id);
        return next;
      });
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // Bulk Delete Selected Rooms
  const toggleSelectRoomId = (id: number) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filtered.length === 0) return;
    const allSelected = filtered.every((r) => selectedRoomIds.has(r.id));
    if (allSelected) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRoomIds);
    if (ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 phòng để xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${ids.length} phòng đã chọn không? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post<{ count: number; message: string }>('/rooms/bulk-delete', { ids });
      const count = data?.count ?? ids.length;
      toast.success(`Đã xóa thành công ${count} phòng!`);
      setSelectedRoomIds(new Set());
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
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
      toast.error('Vui lòng chọn file ảnh hợp lệ');
      return;
    }
    const formPayload = new FormData();
    files.forEach((file) => formPayload.append('images', file));
    setUploading(true);
    try {
      const { data } = await api.post<{ urls: string[] }>('/upload', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
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

  // ----------------------------------------------------
  // ROOM TEXT PARSER / RECOGNITION HANDLERS
  // ----------------------------------------------------

  const openTextParserModal = () => {
    setParseInputText('');
    setParseResult(null);
    setSelectedRoomIndexes(new Set());
    setParseModalOpen(true);
  };

  const handleAnalyzeText = async () => {
    if (!parseInputText.trim()) {
      toast.error('Vui lòng nhập hoặc dán văn bản phòng cần nhận diện');
      return;
    }
    setParseLoading(true);
    try {
      const { data } = await api.post<ParseResult>('/rooms/parse', {
        text: parseInputText,
        preview: true,
      });

      setParseResult(data);

      // Select all parsed rooms by default
      const defaultSelected = new Set<number>();
      (data.rooms || []).forEach((_, idx) => {
        defaultSelected.add(idx);
      });
      setSelectedRoomIndexes(defaultSelected);

      if ((data.rooms || []).length > 0) {
        toast.success(`Đã nhận diện ${data.rooms.length} phòng từ văn bản!`);
      } else {
        toast.warning('Không tìm thấy thông tin phòng phù hợp trong văn bản');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setParseLoading(false);
    }
  };

  const toggleSelectRoomIndex = (idx: number) => {
    setSelectedRoomIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!parseResult?.rooms) return;
    if (selectedRoomIndexes.size === parseResult.rooms.length) {
      setSelectedRoomIndexes(new Set());
    } else {
      setSelectedRoomIndexes(new Set(parseResult.rooms.map((_, idx) => idx)));
    }
  };

  const handleImportSelectedRooms = async () => {
    if (!parseResult?.rooms || selectedRoomIndexes.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 phòng để nhập');
      return;
    }

    const roomsToImport = parseResult.rooms.filter((_, idx) => selectedRoomIndexes.has(idx));
    setParseImporting(true);

    try {
      const { data } = await api.post('/rooms/parse', {
        rooms: roomsToImport,
        allowDuplicates: true,
      });

      const countCreated = data?.summary?.created ?? data?.created?.length ?? roomsToImport.length;
      toast.success(`Đã nhập thành công ${countCreated} phòng vào hệ thống!`);
      setParseModalOpen(false);
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setParseImporting(false);
    }
  };

  // Quick single room parse
  const handleQuickSingleParse = async () => {
    if (!singleQuickText.trim()) {
      toast.error('Vui lòng dán nội dung văn bản phòng');
      return;
    }
    setSingleQuickBusy(true);
    try {
      const { data } = await api.post<ParseResult>('/rooms/parse', {
        text: singleQuickText,
        preview: true,
      });

      if (data.rooms && data.rooms.length > 0) {
        const parsed = data.rooms[0];
        setForm((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          description: parsed.description || prev.description,
          address: parsed.address || prev.address,
          price: parsed.price ? String(parsed.price) : prev.price,
          area: parsed.area ? String(parsed.area) : prev.area,
          district: parsed.district && DISTRICTS.includes(parsed.district) ? parsed.district : prev.district,
          city: parsed.city || prev.city,
          maxPeople: parsed.maxPeople ? String(parsed.maxPeople) : prev.maxPeople,
          phone: parsed.phone || prev.phone,
          zaloLink: parsed.zaloLink || prev.zaloLink,
          electricity: parsed.electricity != null ? String(parsed.electricity) : prev.electricity,
          water: parsed.water != null ? String(parsed.water) : prev.water,
          internet: parsed.internet != null ? String(parsed.internet) : prev.internet,
          serviceFee: parsed.serviceFee != null ? String(parsed.serviceFee) : prev.serviceFee,
          status: parsed.status || prev.status,
          amenities: parsed.amenities && parsed.amenities.length > 0 ? parsed.amenities : prev.amenities,
        }));
        setShowSingleQuickParse(false);
        toast.success('✨ Đã điền thông tin phòng từ văn bản!');
      } else {
        toast.warning('Không tìm thấy thông tin phòng hợp lệ');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSingleQuickBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50';

  const isAllFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedRoomIds.has(r.id));

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phòng theo tên, địa chỉ, quận..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyStandardTemplate}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            title="Sao chép mẫu khuôn tin đăng vào clipboard"
          >
            <Copy size={14} className="text-slate-500" />
            Copy mẫu khuôn
          </button>
          <button
            onClick={openTextParserModal}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
          >
            <Sparkles size={16} />
            Nhận diện văn bản
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} />
            Thêm phòng
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Hiển thị khi có phòng được tích chọn) */}
      {selectedRoomIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              Đã chọn <strong className="text-rose-700 font-bold">{selectedRoomIds.size}</strong> / {rooms.length} phòng
            </span>
            <button
              onClick={() => setSelectedRoomIds(new Set())}
              className="text-xs font-semibold text-rose-600 hover:underline ml-2"
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 transition"
          >
            <Trash2 size={14} />
            {busy ? 'Đang xóa...' : `Xóa ${selectedRoomIds.size} phòng đã chọn`}
          </button>
        </div>
      )}

      {/* Rooms Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-3 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  title="Chọn / Bỏ chọn tất cả phòng hiển thị"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
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
            {filtered.map((r) => {
              const isSelected = selectedRoomIds.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition ${
                    isSelected ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRoomId(r.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.images?.[0] ? (
                        <img src={r.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-14 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                          Chưa có ảnh
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-800">{r.title}</div>
                        <div className="max-w-[220px] truncate text-xs text-slate-500">{r.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{formatPrice(r.price)}</td>
                  <td className="px-4 py-3">{r.area ? `${r.area} m²` : '—'}</td>
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
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      {r.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.phone}</td>
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
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                  Không tìm thấy phòng phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================
          MODAL: NHẬN DIỆN VĂN BẢN PHÒNG (BULK / MULTI-ROOM PARSER)
         ========================================================= */}
      {parseModalOpen && (
        <Modal
          title="Nhận diện & Nhập liệu phòng từ văn bản"
          onClose={() => setParseModalOpen(false)}
          wide
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900">
              <div className="font-semibold flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Wand2 size={14} className="text-indigo-600" />
                  Hệ thống tự động nhận diện thông minh từ văn bản:
                </span>
                <button
                  type="button"
                  onClick={copyStandardTemplate}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Copy size={12} />
                  📋 Copy mẫu khuôn chuẩn
                </button>
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-indigo-700">
                <li>Tên / Mã phòng (P.101, B201...), Địa chỉ, Quận / Huyện TP.HCM</li>
                <li>Giá thuê (3tr5, 4.2 triệu, 3500k, 4.000.000đ...), Diện tích (m²), Số người ở</li>
                <li>Tiền điện (đ/kWh), nước, internet, giữ xe, phí dịch vụ</li>
                <li>Tiện ích (máy lạnh, máy giặt, thang máy, wifi, ban công, gác lửng, khóa vân tay, bảo vệ 24/7...)</li>
                <li>SĐT liên hệ & Link Zalo</li>
              </ul>
            </div>

            {/* Input textarea & Sample buttons */}
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-500" />
                  Dán nội dung tin đăng hoặc danh sách phòng:
                </label>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setParseInputText(STANDARD_ROOM_TEMPLATE)}
                    className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-200"
                  >
                    📝 Dán mẫu chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setParseInputText(SAMPLE_TEXT_MULTI)}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Mẫu nhiều phòng
                  </button>
                  <button
                    type="button"
                    onClick={() => setParseInputText(SAMPLE_TEXT_SINGLE)}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Mẫu 1 phòng
                  </button>
                </div>
              </div>
              <textarea
                rows={6}
                value={parseInputText}
                onChange={(e) => setParseInputText(e.target.value)}
                placeholder="Dán bài đăng Zalo, Facebook, ghi chú phòng trọ vào đây..."
                className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleAnalyzeText}
                disabled={parseLoading || !parseInputText.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                <Sparkles size={14} className={parseLoading ? 'animate-spin' : ''} />
                {parseLoading ? 'Đang nhận diện...' : 'Phân tích & Xem trước'}
              </button>
            </div>

            {/* Parsed Result Preview */}
            {parseResult && (
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Kết quả nhận diện ({parseResult.rooms.length} phòng)
                    </span>
                    {parseResult.summary?.duplicatesCount ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {parseResult.summary.duplicatesCount} phòng trùng lặp
                      </span>
                    ) : null}
                  </div>
                  {parseResult.rooms.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      {selectedRoomIndexes.size === parseResult.rooms.length
                        ? 'Bỏ chọn tất cả'
                        : 'Chọn tất cả'}
                    </button>
                  )}
                </div>

                {/* Warnings / Errors */}
                {parseResult.warnings?.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <div className="font-semibold flex items-center gap-1 mb-1">
                      <AlertTriangle size={13} />
                      Lưu ý phân tích:
                    </div>
                    <ul className="list-inside list-disc space-y-0.5">
                      {parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* List of Parsed Rooms */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {parseResult.rooms.map((room, idx) => {
                    const isSelected = selectedRoomIndexes.has(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleSelectRoomIndex(idx)}
                        className={`cursor-pointer rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-500'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRoomIndex(idx)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{room.title}</span>
                                <span className="font-semibold text-blue-600">
                                  {formatPrice(room.price)}
                                </span>
                                {room.area && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                                    {room.area} m²
                                  </span>
                                )}
                                {room.district && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                                    {room.district}
                                  </span>
                                )}
                                {room.isDuplicate && (
                                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                    Đã có trong hệ thống
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">{room.address}</div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {room.electricity != null && (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 font-medium">
                                    Điện: {room.electricity.toLocaleString('vi-VN')} đ/kWh
                                  </span>
                                )}
                                {room.water != null && (
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 font-medium">
                                    Nước: {room.water.toLocaleString('vi-VN')} đ
                                  </span>
                                )}
                                {room.phone && (
                                  <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-700 font-medium">
                                    SĐT: {room.phone}
                                  </span>
                                )}
                                {room.amenities?.map((a) => (
                                  <span
                                    key={a}
                                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                                  >
                                    {AMENITY_META[a] || a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {parseResult.rooms.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Chưa nhận diện được phòng nào. Vui lòng kiểm tra lại văn bản đầu vào.
                    </div>
                  )}
                </div>

                {/* Import Action Footer */}
                {parseResult.rooms.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Đã chọn <strong>{selectedRoomIndexes.size}</strong> / {parseResult.rooms.length} phòng
                    </span>
                    <button
                      type="button"
                      onClick={handleImportSelectedRooms}
                      disabled={parseImporting || selectedRoomIndexes.size === 0}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                    >
                      <CheckCircle2 size={15} />
                      {parseImporting
                        ? 'Đang nhập...'
                        : `Nhập ${selectedRoomIndexes.size} phòng vào hệ thống`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =========================================================
          MODAL: THÊM / SỬA PHÒNG ĐƠN
         ========================================================= */}
      {modalOpen && (
        <Modal
          title={editing ? `Sửa phòng #${editing.id}` : 'Thêm phòng mới'}
          onClose={() => setModalOpen(false)}
          wide
        >
          {/* Quick Parser Helper for Single Room */}
          {!editing && (
            <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <button
                type="button"
                onClick={() => setShowSingleQuickParse(!showSingleQuickParse)}
                className="flex w-full items-center justify-between text-xs font-bold text-indigo-800 hover:text-indigo-900"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" />
                  Nhận diện & Điền nhanh từ văn bản tin đăng phòng
                </span>
                {showSingleQuickParse ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showSingleQuickParse && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-500">Nhập tin đăng phòng:</span>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={copyStandardTemplate}
                        className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-1"
                      >
                        <Copy size={11} />
                        Copy mẫu khuôn
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleQuickText(STANDARD_ROOM_TEMPLATE)}
                        className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-200"
                      >
                        📝 Dán mẫu chuẩn
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleQuickText(SAMPLE_TEXT_SINGLE)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        Mẫu 1 phòng
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={singleQuickText}
                    onChange={(e) => setSingleQuickText(e.target.value)}
                    placeholder="Dán đoạn tin đăng của phòng (vd: Phòng 101, 3tr5, 25m2, Lê Văn Sỹ Q3, máy lạnh, wifi, sđt...)"
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs outline-none focus:border-indigo-500 bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleQuickSingleParse}
                      disabled={singleQuickBusy || !singleQuickText.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
                    >
                      <Wand2 size={13} />
                      {singleQuickBusy ? 'Đang trích xuất...' : '✨ Điền tự động vào Form'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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