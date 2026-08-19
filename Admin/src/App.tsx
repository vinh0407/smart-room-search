import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import TenantHistoryPage from './pages/TenantHistory';
import Demands from './pages/Demands';
import Settings from './pages/Settings';
import { api, getToken } from './lib/api';
import type { Demand, Room, RoomStats, Tenant, TenantHistory } from './lib/types';

function useAppData() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [history, setHistory] = useState<TenantHistory[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [roomData, statsData, tenantData, demandData, historyData] = await Promise.all([
        api.get('/rooms'),
        api.get('/rooms/stats'),
        api.get('/tenants'),
        api.get('/demands'),
        api.get('/tenant-history'),
      ]);
      setRooms(roomData.data);
      setStats(statsData.data);
      setTenants(tenantData.data);
      setDemands(demandData.data);
      setHistory(historyData.data);
    } catch (error) {
      console.error('loadAll failed:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rooms, tenants, history, demands, stats, reload, loaded };
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  const { rooms, tenants, history, demands, stats, reload } = useAppData();
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (reloadKey > 0) reload();
  }, [reloadKey, reload]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <Layout onRefresh={refresh}>
              <Routes>
                <Route
                  path="/dashboard"
                  element={<Dashboard rooms={rooms} tenants={tenants} demands={demands} stats={stats} reload={reload} />}
                />
                <Route path="/rooms" element={<Rooms rooms={rooms} tenants={tenants} reload={reload} />} />
                <Route path="/tenants" element={<Tenants tenants={tenants} rooms={rooms} reload={reload} />} />
                <Route path="/tenant-history" element={<TenantHistoryPage history={history} reload={reload} />} />
                <Route path="/demands" element={<Demands demands={demands} reload={reload} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}