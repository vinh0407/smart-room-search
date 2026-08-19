import { useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api, clearToken, getHealthUrl, setApiBase } from '../lib/api';
import type { HealthInfo } from '../lib/types';
import { formatDateTime } from '../lib/utils';

export default function Settings() {
  const [base, setBase] = useState(api.defaults.baseURL || '');
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch(getHealthUrl());
      const data = await res.json();
      setHealth(data);
      toast.success('Kết nối backend thành công');
    } catch {
      setHealth(null);
      toast.error('Không kết nối được backend');
    } finally {
      setChecking(false);
    }
  };

  const save = () => {
    if (!base.trim()) {
      toast.error('Vui lòng nhập URL API');
      return;
    }
    const normalized = setApiBase(base);
    setBase(normalized);
    toast.success(`Đã lưu API base: ${normalized}`);
    checkHealth();
  };

  const logout = () => {
    clearToken();
    navigate('/login');
  };

  const dbBadge =
    health?.dbMode === 'mysql'
      ? 'bg-emerald-100 text-emerald-700'
      : health?.dbMode === 'json'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';

  const dbLabel =
    health?.dbMode === 'mysql'
      ? 'MySQL (kết nối database thật)'
      : health?.dbMode === 'json'
        ? 'JSON (dữ liệu trong file)'
        : 'Không kết nối được backend';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-bold">API Base URL</h3>
        <div className="flex gap-2">
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://.../api"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            onClick={save}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Save size={15} />
            Lưu
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Có thể truyền qua URL: <code className="rounded bg-slate-100 px-1">?api=https://.../api</code> (tự động lưu)
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">Trạng thái backend</h3>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${dbBadge}`}>{dbLabel}</span>
          {health?.timestamp && (
            <span className="text-xs text-slate-400">Cập nhật: {formatDateTime(health.timestamp)}</span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-3 text-sm font-bold">Phiên làm việc</h3>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100"
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}