import { useState } from 'react';
import { Building2, DoorOpen, Users, Wrench, Megaphone } from 'lucide-react';
import type { Demand, Room, RoomStats, Tenant } from '../lib/types';
import { formatPrice } from '../lib/utils';
import { usePolling } from '../lib/usePolling';

interface DashboardProps {
  rooms: Room[];
  tenants: Tenant[];
  demands: Demand[];
  stats: RoomStats | null;
  reload: () => void;
}

export default function Dashboard({ rooms, tenants, demands, stats, reload }: DashboardProps) {
  const [enabled] = useState(true);
  usePolling(reload, 5000, enabled);

  const cards = [
    { label: 'Tổng phòng', value: stats?.total ?? rooms.length, icon: Building2, color: 'bg-blue-100 text-blue-700' },
    { label: 'Đang trống', value: stats?.available ?? 0, icon: DoorOpen, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Đã thuê', value: stats?.rented ?? 0, icon: Users, color: 'bg-rose-100 text-rose-700' },
    {
      label: 'Bảo trì',
      value: rooms.filter((r) => r.status === 'maintenance').length,
      icon: Wrench,
      color: 'bg-amber-100 text-amber-700',
    },
    { label: 'Khách đang thuê', value: tenants.length, icon: Users, color: 'bg-violet-100 text-violet-700' },
    { label: 'Nhu cầu mới', value: demands.length, icon: Megaphone, color: 'bg-cyan-100 text-cyan-700' },
  ];

  const byDistrict = Object.entries(
    rooms.reduce<Record<string, number>>((acc, r) => {
      acc[r.district] = (acc[r.district] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxDistrict = Math.max(1, ...byDistrict.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold">Phòng theo quận</h3>
          <div className="space-y-2">
            {byDistrict.map(([district, count]) => (
              <div key={district} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-xs font-medium text-slate-600">{district}</div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(count / maxDistrict) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-semibold">{count}</div>
              </div>
            ))}
            {byDistrict.length === 0 && (
              <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold">Phòng mới nhất</h3>
          <div className="space-y-2">
            {rooms.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.district}</div>
                </div>
                <div className="shrink-0 text-sm font-semibold">{formatPrice(r.price)}</div>
              </div>
            ))}
            {rooms.length === 0 && (
              <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}