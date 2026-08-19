import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  RefreshCw,
  Settings,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getHealthUrl, clearToken } from '../lib/api';
import type { HealthInfo } from '../lib/types';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/rooms', label: 'Phòng trọ', icon: Building2 },
  { to: '/tenants', label: 'Khách thuê', icon: Users },
  { to: '/tenant-history', label: 'Lịch sử khách thuê', icon: History },
  { to: '/demands', label: 'Nhu cầu tìm phòng', icon: Megaphone },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Layout({ children, onRefresh }: { children: ReactNode; onRefresh: () => void }) {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const check = () => {
      fetch(getHealthUrl())
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => setHealth(null));
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [location.pathname]);

  const logout = () => {
    clearToken();
    navigate('/login');
  };

  const dbBadge =
    health?.dbMode === 'mysql' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <Wifi size={12} /> MySQL
      </span>
    ) : health?.dbMode === 'json' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Wifi size={12} /> JSON
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
        <WifiOff size={12} /> Không kết nối
      </span>
    );

  const currentTitle = NAV_ITEMS.find((i) => location.pathname.startsWith(i.to))?.label || '';

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="text-sm font-bold">Smart Room</div>
            <div className="text-xs text-slate-500">Quản trị</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <h1 className="text-base font-bold md:text-lg">{currentTitle}</h1>
          <div className="flex items-center gap-3">
            {dbBadge}
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Làm mới
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
        {NAV_ITEMS.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}