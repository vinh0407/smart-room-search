const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export const DEFAULT_COORDS = { lat: 10.7731, lng: 106.6952 };

export const isPlaceholderCoords = (lat, lng) => {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return true;
  return (
    Math.abs(la - DEFAULT_COORDS.lat) < 0.0001 &&
    Math.abs(ln - DEFAULT_COORDS.lng) < 0.0001
  );
};

export const buildGeocodeQuery = (address, district, city = 'TP.HCM') =>
  [address, district, city, 'Việt Nam'].filter(Boolean).join(', ');

const stripAccents = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const DISTRICT_CENTROIDS = {
  'quan 1': { lat: 10.7769, lng: 106.7009 },
  'quan 3': { lat: 10.7843, lng: 106.6847 },
  'quan 4': { lat: 10.757, lng: 106.7015 },
  'quan 5': { lat: 10.754, lng: 106.6634 },
  'quan 6': { lat: 10.7465, lng: 106.6351 },
  'quan 7': { lat: 10.734, lng: 106.7219 },
  'quan 8': { lat: 10.724, lng: 106.6286 },
  'quan 10': { lat: 10.7736, lng: 106.667 },
  'quan 11': { lat: 10.7629, lng: 106.6506 },
  'quan 12': { lat: 10.8671, lng: 106.6413 },
  'go vap': { lat: 10.8386, lng: 106.6654 },
  'binh thanh': { lat: 10.8106, lng: 106.7091 },
  'tan binh': { lat: 10.8014, lng: 106.6526 },
  'tan phu': { lat: 10.7905, lng: 106.6282 },
  'phu nhuan': { lat: 10.7992, lng: 106.6803 },
  'binh tan': { lat: 10.7652, lng: 106.6038 },
  'thu duc': { lat: 10.8494, lng: 106.7537 },
  'binh chanh': { lat: 10.6871, lng: 106.5946 },
  'hoc mon': { lat: 10.883, lng: 106.5953 },
  'nha be': { lat: 10.6957, lng: 106.7441 },
  'cu chi': { lat: 11.037, lng: 106.4953 },
  'can gio': { lat: 10.4113, lng: 106.9547 },
};

const districtCentroid = (district) => {
  const key = stripAccents(district);
  const hit = DISTRICT_CENTROIDS[key];
  if (!hit) return null;
  return {
    lat: hit.lat,
    lng: hit.lng,
    display_name: district,
    query: district,
    source: 'district-centroid',
  };
};

export const geocodeLocation = async (address, district, city = 'TP.HCM') => {
  const query = buildGeocodeQuery(address, district, city);
  if (!query.trim()) return districtCentroid(district);

  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '1',
      countrycodes: 'vn',
    });

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': 'SmartRoomSearch/1.0 (geocode)',
        'Accept-Language': 'vi',
      },
    });

    if (!response.ok) return districtCentroid(district);

    const data = await response.json();
    if (!data?.length) return districtCentroid(district);

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
      query,
    };
  } catch {
    return districtCentroid(district);
  }
};

export const resolveRoomCoordinates = async (room) => {
  if (!room?.address || !isPlaceholderCoords(room.lat, room.lng)) {
    return { room, changed: false };
  }

  const geo = await geocodeLocation(room.address, room.district, room.city);
  if (!geo) return { room, changed: false };

  return {
    room: { ...room, lat: geo.lat, lng: geo.lng },
    changed: true,
  };
};
