import { useState } from 'react';
import { Database, LogOut, RefreshCw, Save, Server } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api, API_PRESETS, clearToken, getDbHealthUrl, getHealthUrl, setApiBase } from '../lib/api';
import type { HealthInfo } from '../lib/types';
import { formatDateTime } from '../lib/utils';

export default function Settings() {
  const [base, setBase] = useState(api.defaults.baseURL || '');
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch(getHealthUrl());
      const data = await res.json();
      setHealth(data);

      try {
        const dbRes = await fetch(getDbHealthUrl());
        const dbData = await dbRes.json();
        setDbStatus(dbData.status === 'ok' ? 'connected' : 'error');
      } catch {
        setDbStatus(null);
      }

      toast.success('Kết nối backend thành công');
    } catch {
      setHealth(null);
      setDbStatus(null);
      toast.error('Không kết nối được backend');
    } finally {
      setChecking(false);
    }
  };

  const selectPreset = (presetUrl: string) => {
    setBase(presetUrl);
    const normalized = setApiBase(presetUrl);
    setBase(normalized);
    toast.success(`Đã chọn API base: ${normalized}`);
    checkHealth();
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

  const isTidbOrMysql = health?.dbMode === 'mysql' || health?.dbMode === 'tidb-data-service';

  const dbBadge = isTidbOrMysql
    ? 'bg-emerald-100 text-emerald-700'
    : health?.dbMode === 'json'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700';

  const dbLabel =
    health?.dbMode === 'mysql'
      ? 'TiDB / MySQL (Kết nối database thật)'
      : health?.dbMode === 'tidb-data-service'
        ? 'TiDB Cloud Data Service'
        : health?.dbMode === 'json'
          ? 'JSON Mock (Dữ liệu file cục bộ)'
          : 'Không kết nối được backend';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-bold flex items-center gap-2">
          <Server size={16} className="text-blue-600" />
          API Base URL (Backend TiDB / Express)
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Chọn một trong các cấu hình có sẵn hoặc nhập URL Backend tùy chỉnh của bạn.
        </p>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {API_PRESETS.map((p) => {
            const isSelected = base === p.url || api.defaults.baseURL === p.url;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p.url)}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">{p.name}</span>
                <span className="mt-1 font-mono text-[11px] text-slate-500">{p.url}</span>
                <span className="mt-1 text-[10px] text-slate-400">{p.description}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="http://localhost:4000/api"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
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
          Có thể truyền qua URL: <code className="rounded bg-slate-100 px-1">?api=http://localhost:4000/api</code> (tự động lưu)
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Database size={16} className="text-emerald-600" />
            Trạng thái Backend & Database
          </h3>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${dbBadge}`}>{dbLabel}</span>
          {dbStatus === 'connected' && (
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              ✓ Database Active
            </span>
          )}
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