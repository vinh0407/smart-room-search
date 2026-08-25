import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Filter,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Demand, DemandParsedData } from '../lib/types';
import { DISTRICTS, formatDate, formatPrice } from '../lib/utils';
import Modal from '../components/Modal';
import { usePolling } from '../lib/usePolling';

const SAMPLE_DEMAND_1 = 'Tìm phòng Bình Thạnh khoảng 3-4 triệu, 2 người ở, từ 20m2, có máy lạnh, WC riêng, có chỗ để xe, ưu tiên gần HUTECH.';
const SAMPLE_DEMAND_2 = 'Cần tìm phòng trọ ở Quận 10 tầm 3 củ cho 2 đứa ở, có máy giặt, máy lạnh, tủ lạnh, gần ĐH Bách Khoa không quá 3km, vào ở ngay.';
const SAMPLE_DEMAND_3 = 'Thuê căn hộ mini Tân Bình dưới 5 triệu, 1 người ở, full nội thất, giờ giấc tự do, được nuôi thú cưng.';

const ROOM_TYPES = [
  'Phòng trọ',
  'Căn hộ mini',
  'Căn hộ dịch vụ',
  'Căn hộ',
  'Nhà nguyên căn',
  'Ở ghép / KTX',
  'Văn phòng / Mặt bằng',
];

interface FullDemandForm {
  full_name: string;
  phone: string;
  gender: string;
  district: string;
  room_type: string;
  min_price: string;
  max_price: string;
  min_area: string;
  max_area: string;
  people_count: string;
  bedroom_count: string;
  air_conditioner: boolean;
  washing_machine: boolean;
  private_wc: boolean;
  kitchen: boolean;
  parking: boolean;
  full_furniture: boolean;
  furniture_list: string;
  max_distance: string;
  preferred_location: string;
  move_in_date: string;
  special_requirements: string;
  note: string;
}

const emptyFullDemandForm = (): FullDemandForm => ({
  full_name: '',
  phone: '',
  gender: '',
  district: '',
  room_type: '',
  min_price: '',
  max_price: '',
  min_area: '',
  max_area: '',
  people_count: '1',
  bedroom_count: '',
  air_conditioner: false,
  washing_machine: false,
  private_wc: false,
  kitchen: false,
  parking: false,
  full_furniture: false,
  furniture_list: '',
  max_distance: '',
  preferred_location: '',
  move_in_date: '',
  special_requirements: '',
  note: '',
});

const formFromDemand = (d: Demand): FullDemandForm => ({
  full_name: d.full_name || '',
  phone: d.phone || '',
  gender: d.gender || '',
  district: d.district || '',
  room_type: d.room_type || '',
  min_price: d.min_price ? String(d.min_price) : '',
  max_price: d.max_price ? String(d.max_price) : '',
  min_area: d.min_area ? String(d.min_area) : '',
  max_area: d.max_area ? String(d.max_area) : '',
  people_count: String(d.people_count || 1),
  bedroom_count: d.bedroom_count ? String(d.bedroom_count) : '',
  air_conditioner: Boolean(d.air_conditioner),
  washing_machine: Boolean(d.washing_machine),
  private_wc: Boolean(d.private_wc),
  kitchen: Boolean(d.kitchen),
  parking: Boolean(d.parking),
  full_furniture: Boolean(d.full_furniture),
  furniture_list: Array.isArray(d.furniture_list) ? d.furniture_list.join(', ') : '',
  max_distance: d.max_distance || '',
  preferred_location: d.preferred_location || '',
  move_in_date: d.move_in_date || '',
  special_requirements: d.special_requirements || '',
  note: d.note || '',
});

const formFromParsedData = (p: DemandParsedData, existingForm?: FullDemandForm): FullDemandForm => ({
  full_name: p.full_name || existingForm?.full_name || '',
  phone: p.phone || existingForm?.phone || '',
  gender: existingForm?.gender || '',
  district: p.district || existingForm?.district || '',
  room_type: p.room_type || existingForm?.room_type || '',
  min_price: p.min_price != null ? String(p.min_price) : existingForm?.min_price || '',
  max_price: p.max_price != null ? String(p.max_price) : existingForm?.max_price || '',
  min_area: p.min_area != null ? String(p.min_area) : existingForm?.min_area || '',
  max_area: p.max_area != null ? String(p.max_area) : existingForm?.max_area || '',
  people_count: p.people_count != null ? String(p.people_count) : existingForm?.people_count || '1',
  bedroom_count: p.bedroom_count != null ? String(p.bedroom_count) : existingForm?.bedroom_count || '',
  air_conditioner: p.air_conditioner ?? existingForm?.air_conditioner ?? false,
  washing_machine: p.washing_machine ?? existingForm?.washing_machine ?? false,
  private_wc: p.private_wc ?? existingForm?.private_wc ?? false,
  kitchen: p.kitchen ?? existingForm?.kitchen ?? false,
  parking: p.parking ?? existingForm?.parking ?? false,
  full_furniture: p.full_furniture ?? existingForm?.full_furniture ?? false,
  furniture_list: p.furniture_list && p.furniture_list.length > 0 ? p.furniture_list.join(', ') : existingForm?.furniture_list || '',
  max_distance: p.max_distance || existingForm?.max_distance || '',
  preferred_location: p.preferred_location || existingForm?.preferred_location || '',
  move_in_date: p.move_in_date || existingForm?.move_in_date || '',
  special_requirements: p.special_requirements || existingForm?.special_requirements || '',
  note: p.note || existingForm?.note || '',
});

interface DemandsProps {
  demands: Demand[];
  reload: () => void;
}

export default function Demands({ demands, reload }: DemandsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Demand | null>(null);
  const [form, setForm] = useState<FullDemandForm>(emptyFullDemandForm());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  // Top AI Prompt Input State
  const [aiPromptText, setAiPromptText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  // Modal AI Quick Re-parse State
  const [showModalAiParse, setShowModalAiParse] = useState(false);
  const [modalAiText, setModalAiText] = useState('');
  const [modalAiBusy, setModalAiBusy] = useState(false);

  usePolling(reload, 5000, !modalOpen);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return demands;
    return demands.filter(
      (d) =>
        d.full_name?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        (d.district || '').toLowerCase().includes(q) ||
        (d.room_type || '').toLowerCase().includes(q) ||
        (d.preferred_location || '').toLowerCase().includes(q) ||
        (d.note || '').toLowerCase().includes(q)
    );
  }, [demands, search]);

  const set = <K extends keyof FullDemandForm>(key: K, value: FullDemandForm[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyFullDemandForm());
    setShowModalAiParse(false);
    setModalAiText('');
    setModalOpen(true);
  };

  const openEdit = (d: Demand) => {
    setEditing(d);
    setForm(formFromDemand(d));
    setShowModalAiParse(false);
    setModalAiText('');
    setModalOpen(true);
  };

  // Top Level AI Parse Trigger
  const handleAiParseTop = async () => {
    if (!aiPromptText.trim()) {
      toast.error('Vui lòng nhập đoạn mô tả nhu cầu tìm phòng của bạn');
      return;
    }
    setAiParsing(true);
    try {
      const { data } = await api.post<{ success: boolean; data: DemandParsedData }>('/demands/parse', {
        text: aiPromptText,
      });

      if (data.data) {
        setEditing(null);
        setForm(formFromParsedData(data.data));
        setModalOpen(true);
        toast.success('✨ AI đã phân tích nhu cầu và tự động điền vào biểu mẫu!');
      } else {
        toast.warning('Không phân tích được nhu cầu từ văn bản này');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAiParsing(false);
    }
  };

  // Inside Modal AI Parse Trigger
  const handleModalAiParse = async () => {
    if (!modalAiText.trim()) {
      toast.error('Vui lòng nhập mô tả nhu cầu');
      return;
    }
    setModalAiBusy(true);
    try {
      const { data } = await api.post<{ success: boolean; data: DemandParsedData }>('/demands/parse', {
        text: modalAiText,
      });

      if (data.data) {
        setForm((prev) => formFromParsedData(data.data, prev));
        setShowModalAiParse(false);
        toast.success('✨ AI đã cập nhật biểu mẫu theo văn bản mới!');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setModalAiBusy(false);
    }
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error('Vui lòng nhập họ tên và số điện thoại liên hệ');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        gender: form.gender || null,
        district: form.district || null,
        room_type: form.room_type || null,
        min_price: form.min_price ? Number(form.min_price) : null,
        max_price: form.max_price ? Number(form.max_price) : null,
        min_area: form.min_area ? Number(form.min_area) : null,
        max_area: form.max_area ? Number(form.max_area) : null,
        people_count: Number(form.people_count || 1),
        bedroom_count: form.bedroom_count ? Number(form.bedroom_count) : null,
        air_conditioner: form.air_conditioner,
        washing_machine: form.washing_machine,
        private_wc: form.private_wc,
        kitchen: form.kitchen,
        parking: form.parking,
        full_furniture: form.full_furniture,
        furniture_list: form.furniture_list
          ? form.furniture_list.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          : [],
        max_distance: form.max_distance.trim() || null,
        preferred_location: form.preferred_location.trim() || null,
        move_in_date: form.move_in_date.trim() || null,
        special_requirements: form.special_requirements.trim() || null,
        note: form.note.trim(),
      };

      if (editing) {
        await api.put(`/demands/${editing.id}`, payload);
        toast.success('Đã cập nhật nhu cầu tìm phòng');
      } else {
        await api.post('/demands', payload);
        toast.success('Đã lưu nhu cầu tìm phòng mới');
      }
      setModalOpen(false);
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Demand) => {
    if (!window.confirm(`Xóa nhu cầu của "${d.full_name}"?`)) return;
    try {
      await api.delete(`/demands/${d.id}`);
      toast.success('Đã xóa nhu cầu');
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50';

  return (
    <div className="space-y-6">
      {/* =========================================================
          AI NATURAL LANGUAGE PROMPT INPUT BOX (TOP HERO)
         ========================================================= */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-blue-50/80 p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">AI Phân tích nhu cầu tìm phòng</h2>
              <p className="text-xs text-slate-500">
                Nhập đoạn mô tả tự nhiên của khách hàng — AI sẽ tự động trích xuất toàn bộ các trường dữ liệu!
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Tag size={13} className="text-indigo-600" />
            <span>Mẫu thử nhanh:</span>
            <button
              type="button"
              onClick={() => setAiPromptText(SAMPLE_DEMAND_1)}
              className="rounded-lg bg-white border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Bình Thạnh 3-4tr
            </button>
            <button
              type="button"
              onClick={() => setAiPromptText(SAMPLE_DEMAND_2)}
              className="rounded-lg bg-white border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Quận 10 gần Bách Khoa
            </button>
            <button
              type="button"
              onClick={() => setAiPromptText(SAMPLE_DEMAND_3)}
              className="rounded-lg bg-white border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Căn hộ mini Tân Bình
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={aiPromptText}
            onChange={(e) => setAiPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAiParseTop();
              }
            }}
            placeholder="Nhập nhu cầu tìm phòng của bạn (ví dụ: Tìm phòng Bình Thạnh khoảng 3-4 triệu, 2 người ở, từ 20m2, có máy lạnh, WC riêng, có chỗ để xe, ưu tiên gần HUTECH)..."
            className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={handleAiParseTop}
            disabled={aiParsing || !aiPromptText.trim()}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            <Sparkles size={16} className={aiParsing ? 'animate-spin' : ''} />
            {aiParsing ? 'Đang phân tích...' : '✨ AI phân tích'}
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhu cầu..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Thêm nhu cầu
        </button>
      </div>

      {/* Demands Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Khu vực</th>
              <th className="px-4 py-3">Loại phòng</th>
              <th className="px-4 py-3">Ngân sách</th>
              <th className="px-4 py-3">Diện tích / Người</th>
              <th className="px-4 py-3">Tiện ích & Yêu cầu</th>
              <th className="px-4 py-3">Ghi chú</th>
              <th className="px-4 py-3">Ngày gửi</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const priceText =
                d.min_price && d.max_price
                  ? `${formatPrice(d.min_price)} - ${formatPrice(d.max_price)}`
                  : d.max_price
                    ? `<= ${formatPrice(d.max_price)}`
                    : d.min_price
                      ? `>= ${formatPrice(d.min_price)}`
                      : '—';

              const areaText =
                d.min_area && d.max_area
                  ? `${d.min_area} - ${d.max_area} m²`
                  : d.min_area
                    ? `>= ${d.min_area} m²`
                    : d.max_area
                      ? `<= ${d.max_area} m²`
                      : null;

              return (
                <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{d.full_name}</div>
                    <div className="text-xs text-slate-500">{d.phone}</div>
                    {d.gender && <div className="text-[11px] text-slate-400">Giới tính: {d.gender}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">{d.district || 'Tất cả quận'}</span>
                    {d.preferred_location && (
                      <div className="flex items-center gap-1 text-[11px] text-indigo-600">
                        <MapPin size={11} />
                        Gần {d.preferred_location}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-600">{d.room_type || 'Phòng trọ'}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{priceText}</td>
                  <td className="px-4 py-3">
                    <div>{areaText || '—'}</div>
                    <div className="text-xs text-slate-500">{d.people_count || 1} người</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                      {d.air_conditioner && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          Máy lạnh
                        </span>
                      )}
                      {d.washing_machine && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                          Máy giặt
                        </span>
                      )}
                      {d.private_wc && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          WC riêng
                        </span>
                      )}
                      {d.kitchen && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Bếp
                        </span>
                      )}
                      {d.parking && (
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                          Chỗ để xe
                        </span>
                      )}
                      {d.full_furniture && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                          Full nội thất
                        </span>
                      )}
                      {d.special_requirements && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {d.special_requirements}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[180px] truncate text-xs text-slate-500" title={d.note}>
                      {d.note || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(d)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        title="Sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => remove(d)}
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
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Chưa có nhu cầu nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================
          MODAL: THÊM / SỬA NHU CẦU & KIỂM TRA KẾT QUẢ AI
         ========================================================= */}
      {modalOpen && (
        <Modal
          title={editing ? `Sửa nhu cầu #${editing.id}` : 'Thêm / Xác nhận nhu cầu tìm phòng'}
          onClose={() => setModalOpen(false)}
          wide
        >
          {/* Collapsible AI Re-parse in Modal */}
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <button
              type="button"
              onClick={() => setShowModalAiParse(!showModalAiParse)}
              className="flex w-full items-center justify-between text-xs font-bold text-indigo-800 hover:text-indigo-900"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                ✨ Phân tích lại hoặc dán mô tả nhu cầu tự nhiên mới
              </span>
              {showModalAiParse ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showModalAiParse && (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={2}
                  value={modalAiText}
                  onChange={(e) => setModalAiText(e.target.value)}
                  placeholder="Dán câu mô tả tìm phòng (vd: Tìm phòng Bình Thạnh khoảng 3-4 triệu, 2 người ở, từ 20m2, có máy lạnh, WC riêng, gần HUTECH)..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-500 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAiText(SAMPLE_DEMAND_1)}
                    className="rounded bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-200"
                  >
                    Dán mẫu 1
                  </button>
                  <button
                    type="button"
                    onClick={handleModalAiParse}
                    disabled={modalAiBusy || !modalAiText.trim()}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <Wand2 size={12} />
                    {modalAiBusy ? 'Đang phân tích...' : '✨ Điền lại vào biểu mẫu'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {/* Thông tin cơ bản */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Họ tên *</label>
              <input
                className={inputClass}
                placeholder="Nguyễn Văn A"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">SĐT *</label>
              <input
                className={inputClass}
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giới tính</label>
              <select
                className={inputClass}
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
              >
                <option value="">— Không xác định —</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {/* Khu vực & Loại phòng */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Khu vực / Quận</label>
              <select
                className={inputClass}
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
              >
                <option value="">— Tất cả quận —</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Loại phòng</label>
              <select
                className={inputClass}
                value={form.room_type}
                onChange={(e) => set('room_type', e.target.value)}
              >
                <option value="">— Mọi loại phòng —</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số người ở</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.people_count}
                onChange={(e) => set('people_count', e.target.value)}
              />
            </div>

            {/* Khoảng giá */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giá tối thiểu (VNĐ)</label>
              <input
                type="number"
                step="100000"
                placeholder="3000000"
                className={inputClass}
                value={form.min_price}
                onChange={(e) => set('min_price', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giá tối đa (VNĐ)</label>
              <input
                type="number"
                step="100000"
                placeholder="4000000"
                className={inputClass}
                value={form.max_price}
                onChange={(e) => set('max_price', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số phòng ngủ</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                className={inputClass}
                value={form.bedroom_count}
                onChange={(e) => set('bedroom_count', e.target.value)}
              />
            </div>

            {/* Diện tích */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Diện tích tối thiểu (m²)</label>
              <input
                type="number"
                placeholder="20"
                className={inputClass}
                value={form.min_area}
                onChange={(e) => set('min_area', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Diện tích tối đa (m²)</label>
              <input
                type="number"
                placeholder="35"
                className={inputClass}
                value={form.max_area}
                onChange={(e) => set('max_area', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Thời gian chuyển vào</label>
              <input
                className={inputClass}
                placeholder="Dọn vào ngay / Đầu tháng sau"
                value={form.move_in_date}
                onChange={(e) => set('move_in_date', e.target.value)}
              />
            </div>

            {/* Vị trí ưu tiên & Khoảng cách */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Địa điểm ưu tiên</label>
              <input
                className={inputClass}
                placeholder="HUTECH, ĐH Bách Khoa..."
                value={form.preferred_location}
                onChange={(e) => set('preferred_location', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Khoảng cách tối đa</label>
              <input
                className={inputClass}
                placeholder="3km / không quá 2km"
                value={form.max_distance}
                onChange={(e) => set('max_distance', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Nội thất cần có</label>
              <input
                className={inputClass}
                placeholder="Tủ lạnh, giường, máy giặt..."
                value={form.furniture_list}
                onChange={(e) => set('furniture_list', e.target.value)}
              />
            </div>

            {/* Checkboxes Tiện ích */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tiện ích yêu cầu</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-medium hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.air_conditioner}
                    onChange={(e) => set('air_conditioner', e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Có máy lạnh
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-medium hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.washing_machine}
                    onChange={(e) => set('washing_machine', e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Có máy giặt
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-medium hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.private_wc}
                    onChange={(e) => set('private_wc', e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Có WC riêng
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-medium hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.kitchen}
                    onChange={(e) => set('kitchen', e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Có bếp / Nấu ăn
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-medium hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.parking}
                    onChange={(e) => set('parking', e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Chỗ để xe
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-medium hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.full_furniture}
                    onChange={(e) => set('full_furniture', e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Full nội thất
                </label>
              </div>
            </div>

            {/* Yêu cầu đặc biệt & Ghi chú */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Yêu cầu đặc biệt</label>
              <input
                className={inputClass}
                placeholder="Giờ giấc tự do, không chung chủ, cho nuôi thú cưng, an ninh..."
                value={form.special_requirements}
                onChange={(e) => set('special_requirements', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi chú tổng hợp</label>
              <textarea
                rows={2}
                className={inputClass}
                placeholder="Ghi chú thêm về nhu cầu..."
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
            >
              <CheckCircle2 size={16} />
              {busy ? 'Đang lưu...' : 'Lưu nhu cầu'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}