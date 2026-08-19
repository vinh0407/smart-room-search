import { useMemo, useState } from 'react';
import { Edit2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Demand } from '../lib/types';
import { DISTRICTS, formatDate, formatPrice } from '../lib/utils';
import Modal from '../components/Modal';
import { usePolling } from '../lib/usePolling';

interface DemandForm {
  full_name: string;
  phone: string;
  gender: string;
  district: string;
  max_price: string;
  people_count: string;
  note: string;
}

const formFromDemand = (d: Demand): DemandForm => ({
  full_name: d.full_name,
  phone: d.phone,
  gender: d.gender || '',
  district: d.district || '',
  max_price: String(d.max_price || ''),
  people_count: String(d.people_count || 1),
  note: d.note || '',
});

interface DemandsProps {
  demands: Demand[];
  reload: () => void;
}

export default function Demands({ demands, reload }: DemandsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Demand | null>(null);
  const [form, setForm] = useState<DemandForm>(formFromDemand({} as Demand));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  usePolling(reload, 5000, !modalOpen);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return demands;
    return demands.filter(
      (d) =>
        d.full_name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        (d.district || '').toLowerCase().includes(q)
    );
  }, [demands, search]);

  const set = <K extends keyof DemandForm>(key: K, value: DemandForm[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const openEdit = (d: Demand) => {
    setEditing(d);
    setForm(formFromDemand(d));
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error('Vui lòng nhập họ tên và SĐT');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        gender: form.gender || null,
        district: form.district || null,
        max_price: Number(form.max_price || 0),
        people_count: Number(form.people_count || 1),
        note: form.note.trim(),
      };
      if (editing) {
        await api.put(`/demands/${editing.id}`, payload);
        toast.success('Đã cập nhật nhu cầu');
      } else {
        await api.post('/demands', payload);
        toast.success('Đã thêm nhu cầu');
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
    'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50';

  return (
    <div className="space-y-4">
      <div className="relative sm:w-80">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm nhu cầu..."
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Giới tính</th>
              <th className="px-4 py-3">Quận</th>
              <th className="px-4 py-3">Giá tối đa</th>
              <th className="px-4 py-3">Số người</th>
              <th className="px-4 py-3">Ghi chú</th>
              <th className="px-4 py-3">Ngày gửi</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{d.full_name}</td>
                <td className="px-4 py-3">{d.phone}</td>
                <td className="px-4 py-3">{d.gender || '—'}</td>
                <td className="px-4 py-3">{d.district || '—'}</td>
                <td className="px-4 py-3">{d.max_price ? formatPrice(d.max_price) : '—'}</td>
                <td className="px-4 py-3">{d.people_count}</td>
                <td className="px-4 py-3">
                  <div className="max-w-[200px] truncate" title={d.note}>
                    {d.note || '—'}
                  </div>
                </td>
                <td className="px-4 py-3">{formatDate(d.created_at)}</td>
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
            ))}
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

      {modalOpen && (
        <Modal title={editing ? `Sửa nhu cầu #${editing.id}` : 'Thêm nhu cầu'} onClose={() => setModalOpen(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Họ tên *</label>
              <input className={inputClass} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">SĐT *</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giới tính</label>
              <select className={inputClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">—</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Quận</label>
              <select className={inputClass} value={form.district} onChange={(e) => set('district', e.target.value)}>
                <option value="">—</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Giá tối đa (VNĐ)</label>
              <input type="number" className={inputClass} value={form.max_price} onChange={(e) => set('max_price', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số người</label>
              <input type="number" className={inputClass} value={form.people_count} onChange={(e) => set('people_count', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
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
              {busy ? 'Đang lưu...' : 'Lưu nhu cầu'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}