import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export interface RoomMarker {
  id: number;
  title: string;
  lat: number;
  lng: number;
  price?: number;
  address?: string;
  area?: number;
  district?: string;
}

interface RoomMapProps {
  rooms: RoomMarker[];
  userLat?: number | null;
  userLng?: number | null;
  radiusKm?: number;
  height?: string;
  onViewRoom?: (id: number) => void;
  /** detail = zoom vào phòng; overview = xem nhiều phòng + vị trí user */
  variant?: 'overview' | 'detail';
}

const formatPrice = (price?: number) =>
  price ? `${price.toLocaleString('vi-VN')} đ/tháng` : '';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || window.matchMedia('(hover: none)').matches);

function FitBounds({
  rooms,
  userLat,
  userLng,
  variant = 'overview',
}: {
  rooms: RoomMarker[];
  userLat?: number | null;
  userLng?: number | null;
  variant?: 'overview' | 'detail';
}) {
  const map = useMap();
  useEffect(() => {
    const roomPoints: [number, number][] = rooms.map((r) => [r.lat, r.lng]);
    if (roomPoints.length === 0) return;

    if (variant === 'detail') {
      map.setView(roomPoints[0], 16, { animate: false });
      return;
    }

    const points = [...roomPoints];
    if (userLat && userLng) points.push([userLat, userLng]);

    // Đảm bảo map không bị zoom quá xa hoặc quá gần một cách bất thường
    try {
      if (points.length > 0) {
        map.fitBounds(points, {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
          duration: 1
        });
      }
    } catch (e) {
      console.error("Map fitBounds error", e);
    }
  }, [rooms, userLat, userLng, map, variant]);
  return null;
}

function RoomMarkerItem({ room, onViewRoom }: { room: RoomMarker; onViewRoom?: (id: number) => void }) {
  const markerRef = useRef<L.Marker>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearCloseTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => markerRef.current?.closePopup(), 280);
  };

  const openPopup = () => {
    clearCloseTimer();
    markerRef.current?.openPopup();
  };

  return (
    <Marker
      ref={markerRef}
      position={[room.lat, room.lng]}
      eventHandlers={{
        mouseover: () => {
          if (!isTouchDevice()) openPopup();
        },
        mouseout: () => {
          if (!isTouchDevice()) scheduleClose();
        },
        click: () => openPopup(),
      }}
    >
      <Popup
        className="room-map-popup-wrap"
        closeButton
        eventHandlers={{
          mouseover: clearCloseTimer,
          mouseout: () => {
            if (!isTouchDevice()) scheduleClose();
          },
        }}
      >
        <div className="room-map-popup">
          <p className="room-map-popup__title">{room.title}</p>
          {room.price != null && room.price > 0 && (
            <p className="room-map-popup__price">{formatPrice(room.price)}</p>
          )}
          {(room.district || room.area) && (
            <p className="room-map-popup__meta">
              {[room.district, room.area ? `${room.area} m²` : ''].filter(Boolean).join(' · ')}
            </p>
          )}
          {room.address && (
            <p className="room-map-popup__address">{room.address}</p>
          )}
          {onViewRoom && (
            <button
              type="button"
              className="room-map-popup__btn"
              onClick={(e) => {
                e.stopPropagation();
                onViewRoom(room.id);
              }}
            >
              Xem toàn bộ
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function RoomMap({
  rooms,
  userLat,
  userLng,
  radiusKm = 5,
  height = '360px',
  onViewRoom,
  variant = 'overview',
}: RoomMapProps) {
  const validRooms = rooms.filter((r) => r.lat && r.lng && !isNaN(r.lat) && !isNaN(r.lng));
  const center: [number, number] = validRooms.length > 0
    ? [validRooms[0].lat, validRooms[0].lng]
    : userLat && userLng
      ? [userLat, userLng]
      : [10.8231, 106.6297];

  const showUserRadius = variant === 'overview' && userLat && userLng;

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={variant === 'detail' ? 16 : 13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds rooms={validRooms} userLat={userLat} userLng={userLng} variant={variant} />

        {userLat && userLng && (
          <Marker position={[userLat, userLng]} icon={userIcon}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

        {showUserRadius && (
          <Circle center={[userLat!, userLng!]} radius={radiusKm * 1000} pathOptions={{ color: '#3b82f6', fillOpacity: 0.08 }} />
        )}

        {validRooms.map((room) => (
          <RoomMarkerItem key={room.id} room={room} onViewRoom={onViewRoom} />
        ))}
      </MapContainer>
    </div>
  );
}
