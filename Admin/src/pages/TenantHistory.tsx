import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { TenantHistory } from '../lib/types';
import { formatDate, formatDateTime, formatPrice } from '../lib/utils';
import { usePolling } from '../lib/usePolling';

interface HistoryProps {
  history: TenantHistory[];
  reload: () => void;
}

export default function TenantHistoryPage({ history, reload }: HistoryProps) {
  const [search, setSearch] = useState('');
  usePolling(reload, 5000, true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.full_name.toLowerCase().includes(q) ||
        h.phone.toLowerCase().includes(q) ||
        h.room_title.toLowerCase().includes(q) ||
        h.delete_reason.toLowerCase().includes(q)
    );
  }, [history, search]);

  return (
    <div className="space-y-4">
      <div className="relative sm:w-80">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm trong lịch sử..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-9 text-sm outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Phòng</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Tiền cọc</th>
              <th className="px-4 py-3">Ngày nhận phòng</th>
              <th className="px-4 py-3">Ngày rời</th>
              <th className="px-4 py-3">Lý do</th>
              <th className="px-4 py-3">Thời điểm xóa</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{h.room_title}</div>
                  <div className="text-xs text-slate-400">#{h.room_id}</div>
                </td>
                <td className="px-4 py-3 font-medium">{h.full_name}</td>
                <td className="px-4 py-3">{h.phone}</td>
                <td className="px-4 py-3">{formatPrice(h.deposit_amount)}</td>
                <td className="px-4 py-3">{formatDate(h.move_in_date)}</td>
                <td className="px-4 py-3">{formatDate(h.end_date)}</td>
                <td className="px-4 py-3">{h.delete_reason || '—'}</td>
                <td className="px-4 py-3">{formatDateTime(h.deleted_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  Chưa có lịch sử
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}