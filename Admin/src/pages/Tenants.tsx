import { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Room, Tenant } from '../lib/types';
import { formatDate, formatPrice } from '../lib/utils';
import Modal from '../components/Modal';
import { usePolling } from '../lib/usePolling';

interface TenantForm {
  room_id: string;
  full_name: string;
  phone: string;
  cccd: string;
  deposit_amount: string;
  amount_given: string;
  amount_remaining: string;
  rent_price: string;
  contract_signed_date: string;
  move_in_date: string;
  start_date: string;
  end_date: string;
  people_count: string;
  contract_months: string;
  owner_name: string;
  owner_phone: string;
  payment_status: string;
  note: string;
}

const emptyForm = (): TenantForm => ({
  room_id: '',
  full_name: '',
  phone: '',
  cccd: '',
  deposit_amount: '',
  amount_given: '',
  amount_remaining: '',
  rent_price: '',
  contract_signed_date: '',
  move_in_date: '',
  start_date: '',
  end_date: '',
  people_count: '1',
  contract_months: '',
  owner_name: '',
  owner_phone: '',
  payment_status: '',
  note: '',
});

const formFromTenant = (t: Tenant): TenantForm => ({
  room_id: String(t.room_id),
  full_name: t.full_name,
  phone: t.phone,
  cccd: t.cccd,
  deposit_amount: String(t.deposit_amount),
  amount_given: String(t.amount_given),
  amount_remaining: String(t.amount_remaining),
  rent_price: String(t.rent_price),
  contract_signed_date: t.contract_signed_date || '',
  move_in_date: t.move_in_date || '',
  start_date: t.start_date || '',
  end_date: t.end_date || '',
  people_count: String(t.people_count),
  contract_months: String(t.contract_months),
  owner_name: t.owner_name,
  owner_phone: t.owner_phone,
  payment_status: t.payment_status,
  note: t.note,
});

const toPayload = (f: TenantForm) => ({
  room_id: Number(f.room_id || 0),
  full_name: f.full_name.trim(),
  phone: f.phone.trim(),
  cccd: f.cccd.trim() || null,
  deposit_amount: Number(f.deposit_amount || 0),
  amount_given: Number(f.amount_given || 0),
  amount_remaining: Number(f.amount_remaining || 0),
  rent_price: Number(f.rent_price || 0),
  contract_signed_date: f.contract_signed_date || null,
  move_in_date: f.move_in_date || null,
  start_date: f.start_date || null,
  end_date: f.end_date || null,
  people_count: Number(f.people_count || 1),
  contract_months: Number(f.contract_months || 0),
  owner_name: f.owner_name.trim(),
  owner_phone: f.owner_phone.trim(),
  payment_status: f.payment_status.trim(),
  note: f.note.trim(),
});

interface TenantsProps {
  tenants: Tenant[];
  rooms: Room[];
  reload: () => void;
}

export default function Tenants({ tenants, rooms, reload }: TenantsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  usePolling(reload, 5000, !modalOpen);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.room_title.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const set = <K extends keyof TenantForm>(key: K, value: TenantForm[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm(formFromTenant(t));
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.room_id || !form.full_name.trim()) {
      toast.error('Vui lòng chọn phòng và nhập họ tên');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/tenants/${editing.id}`, toPayload(form));
        toast.success('Đã cập nhật khách thuê');
      } else {
        await api.post('/tenants', toPayload(form));
        toast.success('Đã thêm khách thuê');
      }
      setModalOpen(false);
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: Tenant) => {
    const reason = window.prompt('Lý do xóa khách thuê (sẽ lưu vào lịch sử):', 'Xóa khách thuê');
    if (reason === null) return;
    try {
      await api.delete(`/tenants/${t.id}?reason=${encodeURIComponent(reason || '')}`);
      toast.success('Đã xóa khách thuê');
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
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
            placeholder="Tìm khách thuê..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Thêm khách thuê
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Phòng</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">CCCD</th>
              <th className="px-4 py-3">Tiền cọc</th>
              <th className="px-4 py-3">Đã đưa</th>
              <th className="px-4 py-3">Còn thiếu</th>
              <th className="px-4 py-3">Ngày nhận phòng</th>
              <th className="px-4 py-3">Ngày kết thúc</th>
              <th className="px-4 py-3">Số người</th>
              <th className="px-4 py-3">Thanh toán</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.room_title}</div>
                  <div className="text-xs text-slate-400">#{t.room_id}</div>
                </td>
                <td className="px-4 py-3 font-medium">{t.full_name}</td>
                <td className="px-4 py-3">{t.phone}</td>
                <td className="px-4 py-3">{t.cccd || '—'}</td>
                <td className="px-4 py-3">{formatPrice(t.deposit_amount)}</td>
                <td className="px-4 py-3">{formatPrice(t.amount_given)}</td>
                <td className="px-4 py-3 font-semibold text-rose-600">{formatPrice(t.amount_remaining)}</td>
                <td className="px-4 py-3">{formatDate(t.move_in_date)}</td>
                <td className="px-4 py-3">{formatDate(t.end_date)}</td>
                <td className="px-4 py-3">{t.people_count}</td>
                <td className="px-4 py-3">{t.payment_status || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(t)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => remove(t)}
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
                <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                  Chưa có khách thuê
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Sửa khách thuê #${editing.id}` : 'Thêm khách thuê'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phòng *</label>
              <select className={inputClass} value={form.room_id} onChange={(e) => set('room_id', e.target.value)}>
                <option value="">-- Chọn phòng --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} — {r.title} ({r.district})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Họ tên *</label>
              <input className={inputClass} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">SĐT</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">CCCD</label>
              <input className={inputClass} value={form.cccd} onChange={(e) => set('cccd', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tiền cọc</label>
              <input type="number" className={inputClass} value={form.deposit_amount} onChange={(e) => set('deposit_amount', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Đã đưa</label>
              <input type="number" className={inputClass} value={form.amount_given} onChange={(e) => set('amount_given', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Còn thiếu</label>
              <input type="number" className={inputClass} value={form.amount_remaining} onChange={(e) => set('amount_remaining', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giá thuê (VNĐ)</label>
              <input type="number" className={inputClass} value={form.rent_price} onChange={(e) => set('rent_price', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ngày ký hợp đồng</label>
              <input type="date" className={inputClass} value={form.contract_signed_date} onChange={(e) => set('contract_signed_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ngày nhận phòng</label>
              <input type="date" className={inputClass} value={form.move_in_date} onChange={(e) => set('move_in_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ngày bắt đầu hợp đồng</label>
              <input type="date" className={inputClass} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ngày kết thúc hợp đồng</label>
              <input type="date" className={inputClass} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số người</label>
              <input type="number" className={inputClass} value={form.people_count} onChange={(e) => set('people_count', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số tháng hợp đồng</label>
              <input type="number" className={inputClass} value={form.contract_months} onChange={(e) => set('contract_months', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Chủ phòng</label>
              <input className={inputClass} value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">SĐT chủ phòng</label>
              <input className={inputClass} value={form.owner_phone} onChange={(e) => set('owner_phone', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Trạng thái thanh toán</label>
              <input className={inputClass} value={form.payment_status} onChange={(e) => set('payment_status', e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi chú</label>
              <textarea rows={2} className={inputClass} value={form.note} onChange={(e) => set('note', e.target.value)} />
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
              {busy ? 'Đang lưu...' : 'Lưu khách thuê'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}