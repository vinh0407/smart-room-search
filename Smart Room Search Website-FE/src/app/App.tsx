import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Heart,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Home,
  SlidersHorizontal,
  Wifi,
  Car,
  Wind,
  UtensilsCrossed,
  Bath,
  Layers,
  PawPrint,
  Eye,
  Plus,
  Edit2,
  Trash2,
  BarChart3,
  Image as ImageIcon,
  Tag,
  LogOut,
  Menu,
  Moon,
  Sun,
  ChevronLeft,
  Navigation,
  Share2,
  Bookmark,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  ZoomIn,
  Maximize2,
  Clock,
  Check,
  LayoutDashboard,
  Settings,
  Bell,
  Camera,
  Upload,
  ArrowRight,
  Percent,
  Map,
  ExternalLink,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import api from "../lib/api";
import { useNavigate, useLocation } from "react-router";

const RoomMap = lazy(() => import("./components/RoomMap"));

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type Status = "available" | "rented" | "maintenance";
type View = "home" | "rooms" | "detail" | "favorites";

interface Demand {
  id: number;
  full_name: string;
  phone: string;
  gender?: string | null;
  district?: string | null;
  max_price: number;
  people_count: number;
  note?: string | null;
  created_at?: string;
}

const asDemandList = (payload: unknown): Demand[] => {
  if (Array.isArray(payload)) return payload as Demand[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: Demand[] }).data;
  }
  return [];
};

interface Room {
  id: number;
  name: string;
  price: number;
  electricity?: number;
  water?: number;
  internet?: number;
  serviceFee?: number;
  area?: number;
  maxPeople?: number;
  address: string;
  district: string;
  city: string;
  lat?: number;
  lng?: number;
  status: Status;
  description: string;
  amenities: string[];
  images: string[];
  phone: string;
  zaloLink: string;
  views: number;
  contacts: number;
  isFeatured: boolean;
  isNew: boolean;
  isCheap: boolean;
  rating: number;
}

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  color: string;
}

interface ServicePrice {
  id: string;
  label: string;
  value: number;
  unit: string;
}

interface FilterState {
  search: string;
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  district: string;
  amenities: string[];
  status: string;
}

// ═══════════════════════════════════════════════════════
// STATIC DATA
// ═══════════════════════════════════════════════════════
const AMENITY_META: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  ac: { label: "Máy lạnh", icon: <Wind size={12} /> },
  private_wc: { label: "WC riêng", icon: <Bath size={12} /> },
  washing_machine: {
    label: "Máy giặt",
    icon: <Layers size={12} />,
  },
  kitchen: {
    label: "Bếp",
    icon: <UtensilsCrossed size={12} />,
  },
  balcony: { label: "Ban công", icon: <Home size={12} /> },
  loft: { label: "Gác lửng", icon: <Layers size={12} /> },
  parking: { label: "Để xe", icon: <Car size={12} /> },
  ev_charging: { label: "Sạc xe điện", icon: <Zap size={12} /> },
  pet_friendly: {
    label: "Nuôi thú",
    icon: <PawPrint size={12} />,
  },
  wifi: { label: "Wifi", icon: <Wifi size={12} /> },
};

const DISTRICTS = [
  "Tất cả",
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Bình Thạnh",
  "Gò Vấp",
  "Tân Bình",
  "Tân Phú",
  "Phú Nhuận",
  "Bình Chánh",
  "Bình Tân",
  "Thủ Đức",
  "Cần Giờ",
  "Củ Chi",
  "Hóc Môn",
  "Nhà Bè",
];




const INITIAL_BANNERS: Banner[] = [
  {
    id: 1,
    title: "Tìm phòng trọ dễ dàng",
    subtitle:
      "Hơn 500 phòng trống khắp TP.HCM — không qua trung gian",
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&h=600&fit=crop&auto=format",
    cta: "Xem phòng ngay",
    color: "from-orange-600/80 to-orange-900/60",
  },
  {
    id: 2,
    title: "Phòng cao cấp giá tốt",
    subtitle:
      "Studio đầy đủ nội thất từ 3 triệu/tháng tại trung tâm",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&h=600&fit=crop&auto=format",
    cta: "Khám phá",
    color: "from-slate-900/70 to-slate-700/50",
  },
  {
    id: 3,
    title: `Ưu đãi tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
    subtitle: "Giảm giá 10% khi thuê qua website",
    image:
      "https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=1400&h=600&fit=crop&auto=format",
    cta: "Đăng ký ngay",
    color: "from-emerald-800/70 to-teal-900/60",
  },
];

const INITIAL_PRICES: ServicePrice[] = [
  {
    id: "electricity",
    label: "Điện",
    value: 3500,
    unit: "đ/kWh",
  },
  {
    id: "water",
    label: "Nước",
    value: 120000,
    unit: "đ/người/tháng",
  },
  {
    id: "internet",
    label: "Internet",
    value: 100000,
    unit: "đ/tháng",
  },
  {
    id: "parking_motorbike",
    label: "Xe máy",
    value: 100000,
    unit: "đ/xe/tháng",
  },
  {
    id: "parking_bicycle",
    label: "Xe đạp",
    value: 30000,
    unit: "đ/xe/tháng",
  },
];

const DEFAULT_FILTER: FilterState = {
  search: "",
  priceMin: 0,
  priceMax: 15000000,
  areaMin: 0,
  areaMax: 100,
  district: "Tất cả",
  amenities: [],
  status: "all",
};

// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════
const formatPrice = (price: number) => {
  if (price >= 1000000)
    return `${(price / 1000000).toFixed(1).replace(".0", "")}tr`;
  return `${(price / 1000).toFixed(0)}k`;
};

const formatPriceFull = (price: number) =>
  price.toLocaleString("vi-VN") + " đ";

const toOptionalNumber = (val: unknown): number | undefined => {
  if (val == null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#f5f5f4"/><g fill="none" stroke="#d6d3d1" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M100 500V200l150-90 150 90v300"/><path d="M250 500V340h100v160"/></g><text x="400" y="330" font-family="Arial" font-size="34" fill="#a8a29e" text-anchor="middle">Không có hình ảnh</text></svg>`
  );

const mapApiRoomToRoom = (room: any): Room => ({
  id: room.id,
  name: room.title || "Phòng trọ",
  price: Number(room.price || 0),
  electricity: toOptionalNumber(room.electricity),
  water: toOptionalNumber(room.water),
  internet: toOptionalNumber(room.internet),
  serviceFee: toOptionalNumber(room.serviceFee),
  area: toOptionalNumber(room.area),
  maxPeople: toOptionalNumber(room.maxPeople),
  address: room.address || "",
  district: room.district || "Quận 1",
  city: room.city || "TP.HCM",
  lat: room.lat != null && room.lat !== '' ? Number(room.lat) : undefined,
  lng: room.lng != null && room.lng !== '' ? Number(room.lng) : undefined,
  status:
    room.status === "rented"
      ? "rented"
      : room.status === "maintenance"
        ? "maintenance"
        : "available",
  description: room.description || "",
  amenities: Array.isArray(room.amenities) ? room.amenities : [],
  images: Array.isArray(room.images) ? room.images : [],
  phone: room.phone || "0337244067",
  zaloLink: room.zaloLink || "https://zalo.me/0337244067",
  views: Number(room.views ?? 0),
  contacts: Number(room.contacts ?? 0),
  isFeatured: Boolean(room.isFeatured),
  isNew: Boolean(room.isNew),
  isCheap: Boolean(room.isCheap),
  rating: Number(room.rating ?? 4.5),
});

const getStatusInfo = (status: Status) => {
  switch (status) {
    case "available":
      return {
        label: "Còn trống",
        bg: "bg-emerald-100 text-emerald-700",
        dot: "bg-emerald-500",
      };
    case "rented":
      return {
        label: "Đã thuê",
        bg: "bg-red-100 text-red-600",
        dot: "bg-red-500",
      };
    case "maintenance":
      return {
        label: "Bảo trì",
        bg: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
      };
  }
};

const haversine = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ═══════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════
function AmenityBadge({
  id,
  size = "sm",
}: {
  id: string;
  size?: "sm" | "md";
}) {
  const meta = AMENITY_META[id];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-muted text-muted-foreground font-medium ${
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-3 py-1 text-xs"
      }`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const info = getStatusInfo(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${info.bg}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${info.dot}`}
      />
      {info.label}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
      <Star size={11} fill="currentColor" />
      {rating.toFixed(1)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// ROOM CARD
// ═══════════════════════════════════════════════════════
function RoomCard({
  room,
  onView,
  onToggleFavorite,
  isFavorite,
  distance,
}: {
  room: Room;
  onView: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  isFavorite: boolean;
  distance?: number | null;
}) {
  const status = getStatusInfo(room.status);
  const coverImage = room.images[0] || FALLBACK_IMAGE;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group relative flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onView(room.id)}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={room.name}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_IMAGE) {
              e.currentTarget.src = FALLBACK_IMAGE;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <StatusBadge status={room.status} />
          {room.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white">
              <Star size={9} fill="white" /> Nổi bật
            </span>
          )}
          {room.isNew && (
            <span className="inline-flex items-center rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-bold text-white">
              Mới
            </span>
          )}
          {room.isCheap && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">
              <Percent size={9} /> Rẻ
            </span>
          )}
        </div>
        {/* Heart */}
        <button
          className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
            isFavorite
              ? "bg-red-500 text-white"
              : "bg-white/80 text-foreground hover:bg-red-50"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(room.id);
          }}
        >
          <Heart
            size={14}
            fill={isFavorite ? "white" : "none"}
          />
        </button>
        {/* Price overlay */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-white shadow-lg">
            {formatPrice(room.price)}
            <span className="text-[10px] font-normal opacity-80">
              /tháng
            </span>
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-sm font-bold text-foreground leading-tight">
          {room.name}
        </h3>
        <div className="flex items-start gap-1 text-muted-foreground">
          <MapPin
            size={12}
            className="mt-0.5 shrink-0 text-primary"
          />
          <span className="line-clamp-1 text-[11px]">
            {room.address}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {room.area != null && (
            <span className="flex items-center gap-1">
              <SlidersHorizontal size={10} /> {room.area}m²
            </span>
          )}
          {room.maxPeople != null && (
            <span className="flex items-center gap-1">
              <Users size={10} /> {room.maxPeople} người
            </span>
          )}
          {distance != null && (
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Navigation size={10} />{" "}
              {distance < 1
                ? `${(distance * 1000).toFixed(0)}m`
                : `${distance.toFixed(1)}km`}
            </span>
          )}
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {room.amenities.slice(0, 4).map((a) => (
            <AmenityBadge key={a} id={a} />
          ))}
          {room.amenities.length > 4 && (
            <span className="text-[10px] text-muted-foreground px-1">
              +{room.amenities.length - 4}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
          <RatingStars rating={room.rating} />
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Eye size={10} /> {room.views}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

const MemoRoomCard = React.memo(RoomCard);

// ═══════════════════════════════════════════════════════
// IMAGE GALLERY
// ═══════════════════════════════════════════════════════
function ImageGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const galleryImages =
    images.length > 0 ? images : [FALLBACK_IMAGE];
  const currentImage = galleryImages[active] || FALLBACK_IMAGE;

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-muted">
        <div className="relative h-64 sm:h-96 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={currentImage}
              alt={`${name} - ảnh ${active + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          {/* Nav buttons */}
          {galleryImages.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                onClick={() =>
                  setActive(
                    (a) =>
                      (a - 1 + galleryImages.length) % galleryImages.length,
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                onClick={() =>
                  setActive((a) => (a + 1) % galleryImages.length)
                }
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
          {/* Fullscreen */}
          <button
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 size={14} />
          </button>
          {/* Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {galleryImages.map((_, i) => (
              <button
                key={i}
                className={`rounded-full transition-all ${i === active ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50"}`}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
        </div>
        {/* Thumbnails */}
        {galleryImages.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-card">
            {galleryImages.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative shrink-0 h-14 w-20 overflow-hidden rounded-lg transition-all ${
                  i === active
                    ? "ring-2 ring-primary"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreen(false)}
          >
            <button
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setFullscreen(false)}
            >
              <X size={20} />
            </button>
            <img
              src={currentImage}
              alt={name}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(i);
                  }}
                  className={`rounded-full transition-all ${i === active ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// FILTER PANEL
// ═══════════════════════════════════════════════════════
function FilterPanel({
  filters,
  onChange,
  onReset,
  onClose,
}: {
  filters: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  onReset: () => void;
  onClose?: () => void;
}) {
  const toggleAmenity = (id: string) => {
    const next = filters.amenities.includes(id)
      ? filters.amenities.filter((a) => a !== id)
      : [...filters.amenities, id];
    onChange({ amenities: next });
  };

  return (
    <div className="flex flex-col gap-5">
      {onClose && (
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Bộ lọc</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Status */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Trạng thái
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Tất cả"],
            ["available", "Còn trống"],
            ["rented", "Đã thuê"],
            ["maintenance", "Bảo trì"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => onChange({ status: v })}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                filters.status === v
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Giá thuê: {formatPrice(filters.priceMin)} —{" "}
          {filters.priceMax >= 15000000
            ? "Tất cả"
            : formatPrice(filters.priceMax)}
        </p>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={15000000}
            step={500000}
            value={filters.priceMin}
            onChange={(e) =>
              onChange({ priceMin: +e.target.value })
            }
            className="w-full accent-primary"
          />
          <input
            type="range"
            min={0}
            max={15000000}
            step={500000}
            value={filters.priceMax}
            onChange={(e) =>
              onChange({ priceMax: +e.target.value })
            }
            className="w-full accent-primary"
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            [1500000, "Dưới 2tr"],
            [3000000, "Dưới 3tr"],
            [5000000, "Dưới 5tr"],
            [8000000, "Dưới 8tr"],
          ].map(([v, l]) => (
            <button
              key={String(v)}
              onClick={() =>
                onChange({ priceMax: v as number })
              }
              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all ${
                filters.priceMax === v
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {l as string}
            </button>
          ))}
        </div>
      </div>

      {/* Area */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Diện tích: {filters.areaMin}–
          {filters.areaMax >= 100 ? "100+" : filters.areaMax}m²
        </p>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.areaMax}
          onChange={(e) =>
            onChange({ areaMax: +e.target.value })
          }
          className="w-full accent-primary"
        />
      </div>

      {/* District */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Quận / huyện
        </p>
        <select
          value={filters.district}
          onChange={(e) =>
            onChange({ district: e.target.value })
          }
          className="w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Amenities */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tiện ích
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(AMENITY_META).map(([id, meta]) => (
            <button
              key={id}
              onClick={() => toggleAmenity(id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                filters.amenities.includes(id)
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {filters.amenities.includes(id) ? (
                <Check size={11} className="text-primary" />
              ) : (
                <span className="w-3">{meta.icon}</span>
              )}
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Route-based pages: "/" home, "/rooms" list, "/rooms/:id" detail
  const pathParts = location.pathname.split("/").filter(Boolean);
  let view: View = "home";
  let selectedRoomId: number | null = null;
  if (pathParts[0] === "rooms") {
    if (pathParts.length >= 2 && /^\d+$/.test(pathParts[1])) {
      view = "detail";
      selectedRoomId = Number(pathParts[1]);
    } else {
      view = "rooms";
    }
  } else if (pathParts[0] === "favorites") {
    view = "favorites";
  }

  const [filters, setFilters] =
    useState<FilterState>(DEFAULT_FILTER);
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("sr_favorites") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("sr_dark") === "1",
  );
  const [rooms, setRooms] = useState<Room[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomsReloadKey, setRoomsReloadKey] = useState(0);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [banners, setBanners] =
    useState<Banner[]>(INITIAL_BANNERS);
  const [prices, setPrices] =
    useState<ServicePrice[]>(INITIAL_PRICES);
  const [heroSlide, setHeroSlide] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    title: "",
    description: "",
    address: "",
    price: "",
    area: "",
    status: "available" as Status,
    images: "",
  });
  const [contactedRooms, setContactedRooms] = useState<
    Set<number>
  >(new Set());
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [showDemandMenu, setShowDemandMenu] = useState(false);
  const [showDemandListModal, setShowDemandListModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [demandForm, setDemandForm] = useState({
    full_name: "",
    phone: "",
    gender: "",
    district: "",
    max_price: "",
    people_count: "1",
    note: "",
  });
  const [demandSubmitting, setDemandSubmitting] = useState(false);
  const [demandError, setDemandError] = useState("");
  const [demandsLoading, setDemandsLoading] = useState(true);
  const [demandsError, setDemandsError] = useState("");
  const [demandInputMode, setDemandInputMode] = useState<"form" | "text">("form");
  const [demandText, setDemandText] = useState("");
  const headerRef = useRef<HTMLDivElement>(null);

  const loadDemands = useCallback(async () => {
    setDemandsLoading(true);
    setDemandsError("");
    try {
      const { data } = await api.get("/demands");
      setDemands(asDemandList(data));
    } catch (error) {
      setDemandsError(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách nhu cầu phòng"
      );
    } finally {
      setDemandsLoading(false);
    }
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("sr_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem("sr_favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    setFavorites((prev) => {
      const validIds = new Set(rooms.map((r) => r.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [rooms]);

  // Scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load rooms once on mount (no auto-refresh). Retry by bumping roomsReloadKey.
  useEffect(() => {
    let isMounted = true;
    setRoomsLoading(true);

    const loadRooms = async () => {
      try {
        const { data } = await api.get("/rooms");
        if (isMounted) {
          setRooms(data.map(mapApiRoomToRoom));
          setRoomsError(null);
        }
      } catch (error) {
        console.error("Failed to load rooms from API", error);
        if (isMounted) {
          setRoomsError("Không thể kết nối máy chủ. Xin chờ một chút và thử lại.");
        }
      } finally {
        if (isMounted) setRoomsLoading(false);
      }
    };

    loadRooms();

    loadDemands();

    return () => {
      isMounted = false;
    };
  }, [roomsReloadKey, loadDemands]);

  // Load chi tiết phòng độc lập từ API — không phụ thuộc list.
  // Fix: /rooms/:id truy cập trực tiếp (F5, link chia sẻ) hoặc phòng
  // chưa có trong list (mới tạo) vẫn hiển thị đầy đủ.
  useEffect(() => {
    if (view !== "detail" || selectedRoomId == null) {
      setDetailRoom(null);
      setDetailError(null);
      return;
    }

    let isMounted = true;
    setDetailLoading(true);
    setDetailError(null);

    const loadDetail = async () => {
      try {
        const { data } = await api.get(`/rooms/${selectedRoomId}`);
        if (!isMounted) return;
        setDetailRoom(mapApiRoomToRoom(data));
        setDetailError(null);
        api.post(`/rooms/${selectedRoomId}/view`).catch(() => {});
      } catch (error: any) {
        console.error(`Failed to load room ${selectedRoomId}`, error);
        if (isMounted) {
          setDetailRoom(null);
          if (error?.response?.status === 404) {
            setDetailError("not_found");
          } else {
            setDetailError("Không thể kết nối máy chủ. Xin chờ một chút và thử lại.");
          }
        }
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [view, selectedRoomId, detailReloadKey]);

  // Hero auto-rotate (chỉ khi đang ở trang chủ để tránh re-render thừa)
  useEffect(() => {
    if (view !== "home") return;
    const id = setInterval(
      () => setHeroSlide((s) => (s + 1) % banners.length),
      5000,
    );
    return () => clearInterval(id);
  }, [view, banners.length]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.address.toLowerCase().includes(q) &&
          !r.district.toLowerCase().includes(q)
        )
          return false;
      }
      if (r.price < filters.priceMin) return false;
      if (
        filters.priceMax < 15000000 &&
        r.price > filters.priceMax
      )
        return false;
      if (r.area != null && r.area < filters.areaMin) return false;
      if (
        r.area != null &&
        filters.areaMax < 100 &&
        r.area > filters.areaMax
      )
        return false;
      if (
        filters.district !== "Tất cả" &&
        r.district !== filters.district
      )
        return false;
      if (
        filters.amenities.length > 0 &&
        !filters.amenities.every((a) => r.amenities.includes(a))
      )
        return false;
      if (
        filters.status !== "all" &&
        r.status !== filters.status
      )
        return false;
      return true;
    });
  }, [rooms, filters]);

  const distances = useMemo(() => {
    if (!userLocation) return {};
    return Object.fromEntries(
      rooms
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => [
          r.id,
          haversine(userLocation.lat, userLocation.lng, r.lat!, r.lng!),
        ]),
    );
  }, [rooms, userLocation]);

  const sortedFilteredRooms = useMemo(() => {
    if (!userLocation || Object.keys(distances).length === 0) return filteredRooms;
    return [...filteredRooms].sort((a, b) => {
      const da = distances[a.id] ?? Infinity;
      const db = distances[b.id] ?? Infinity;
      return da - db;
    });
  }, [filteredRooms, distances, userLocation]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
    );
  }, []);

  const viewRoom = useCallback((id: number) => {
    navigate(`/rooms/${id}`);
    setShowFilters(false);
    setRooms((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, views: r.views + 1 } : r,
      ),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const submitDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: demandForm.full_name.trim(),
      phone: demandForm.phone.trim(),
      gender: demandForm.gender || null,
      district: demandForm.district || null,
      max_price: Number(demandForm.max_price || 0),
      people_count: Number(demandForm.people_count || 1),
      note: demandForm.note.trim(),
    };
    setDemandSubmitting(true);
    setDemandError("");
    try {
      const { data } = await api.post("/demands", payload);
      const created = data?.data as Demand | undefined;
      if (!data?.success || !created) {
        throw new Error(data?.message || "Không thể gửi nhu cầu phòng");
      }
      setDemands((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      void loadDemands();
      setShowDemandModal(false);
    } catch (error) {
      setDemandError(error instanceof Error ? error.message : "Gửi nhu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setDemandSubmitting(false);
    }
  };

  const submitDemandFromText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandText.trim()) {
      setDemandError("Vui lòng nhập nội dung nhu cầu phòng");
      return;
    }
    setDemandSubmitting(true);
    setDemandError("");
    try {
      const { data } = await api.post("/demands/parse", { text: demandText });
      if (data?.success && data.data) {
        const parsed = data.data;
        const hasFullName = Boolean(parsed.full_name && String(parsed.full_name).trim());
        const hasPhone = Boolean(parsed.phone && String(parsed.phone).trim());

        if (hasFullName && hasPhone) {
          // Both name & phone are present -> directly submit
          const createdResponse = await api.post("/demands", parsed);
          const created = createdResponse.data?.data as Demand | undefined;
          if (!createdResponse.data?.success || !created) {
            throw new Error(createdResponse.data?.message || "Không thể gửi nhu cầu phòng");
          }
          setDemands((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
          void loadDemands();
          setShowDemandModal(false);
        } else {
          // Pre-fill parsed fields into form and switch to form tab for user to fill missing name/phone
          setDemandForm((prev) => ({
            ...prev,
            full_name: parsed.full_name || prev.full_name,
            phone: parsed.phone || prev.phone,
            district: parsed.district || prev.district,
            max_price: parsed.max_price ? String(parsed.max_price) : prev.max_price,
            people_count: parsed.people_count ? String(parsed.people_count) : prev.people_count,
            note: parsed.note || demandText.trim(),
            gender: parsed.gender || prev.gender,
          }));
          setDemandInputMode("form");
          setDemandError("");
        }
      } else {
        setDemandError(data?.message || "Không thể phân tích nhu cầu phòng");
      }
    } catch (error) {
      setDemandError(error instanceof Error ? error.message : "Phân tích nhu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setDemandSubmitting(false);
    }
  };

const handleContact = useCallback((room: Room) => {
    setContactedRooms((prev) => new Set([...prev, room.id]));
    setRooms((rs) =>
      rs.map((r) =>
        r.id === room.id
          ? { ...r, contacts: r.contacts + 1 }
          : r,
      ),
    );
    api.post(`/rooms/${room.id}/contact`).catch(() => {});
  }, []);

const updateFilter = useCallback(
    (partial: Partial<FilterState>) =>
      setFilters((f) => ({ ...f, ...partial })),
    [],
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTER), []);

const goHome = () => {
    navigate("/");
    window.scrollTo({ top: 0 });
  };

  // Bỏ qua scroll-to-top khi điều hướng do tap ô tìm kiếm
  // (tránh layout nhảy làm đóng bàn phím trên mobile)
  const skipScrollRef = useRef(false);

  // Scroll to top when switching between main pages
  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    if (location.pathname === "/" || location.pathname === "/rooms") {
      window.scrollTo({ top: 0 });
    }
  }, [location.pathname]);

  // ─── HEADER ─────────────────────────────────────────
  const Header = () => (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-40 pt-safe transition-all duration-300 ${
        scrolled
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-card"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-3">
          {/* Logo */}
          <button
            className="flex shrink-0 items-center gap-2"
            onClick={goHome}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="hidden sm:block text-lg font-extrabold text-foreground tracking-tight">
              Trọ<span className="text-primary">Xịn</span>
            </span>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-lg mx-auto">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-input-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
              <Search
                size={15}
                className="shrink-0 text-muted-foreground"
              />
<input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Tìm quận, địa chỉ, tên phòng..."
                value={filters.search}
                onChange={(e) => {
                  if (view !== "rooms") {
                    skipScrollRef.current = true;
                    navigate("/rooms", { preventScrollReset: true });
                  }
                  updateFilter({ search: e.target.value });
                }}
              />
              {filters.search && (
                <button
                  onClick={() => updateFilter({ search: "" })}
                >
                  <X
                    size={13}
                    className="text-muted-foreground"
                  />
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate("/rooms")}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Danh sách phòng
            </button>
            <button
              onClick={() => setShowDemandMenu(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Nhu cầu phòng
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <button
              onClick={() => navigate("/favorites")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors relative"
              title="Phòng đã thích"
            >
              <Heart size={15} className={favorites.size > 0 ? "text-red-500" : "text-muted-foreground"} fill={favorites.size > 0 ? "currentColor" : "none"} />
              {favorites.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{favorites.size}</span>
              )}
            </button>
            <button
              onClick={() => {
                requestLocation();
                navigate("/rooms");
                setShowMapModal(true);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Xem bản đồ phòng"
            >
              <Navigation size={15} className={userLocation ? "text-primary" : "text-muted-foreground"} />
            </button>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              {darkMode ? (
                <Sun size={15} />
              ) : (
                <Moon size={15} />
              )}
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors md:hidden"
              onClick={() => setMobileMenu((m) => !m)}
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-card overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              <button
                onClick={() => {
                  navigate("/rooms");
                  setMobileMenu(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
              >
                Danh sách phòng
              </button>
              <button
                onClick={() => {
                  setShowDemandMenu(true);
                  setMobileMenu(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
              >
                Nhu cầu phòng
              </button>
              <button
                onClick={() => {
                  navigate("/favorites");
                  setMobileMenu(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
              >
                Phòng đã thích
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );

  // ─── HOME ────────────────────────────────────────────
  const HomePage = () => {
    const featuredRooms = rooms.filter(
      (r) => r.isFeatured && r.status === "available",
    );
    const newRooms = rooms.filter((r) => r.isNew);
    const cheapRooms = rooms.filter(
      (r) => r.isCheap && r.status === "available",
    );
    const nearRooms = userLocation
      ? [...rooms]
          .sort(
            (a, b) =>
              (distances[a.id] ?? 99) - (distances[b.id] ?? 99),
          )
          .slice(0, 6)
      : [];

    return (
      <div className="pt-14">
        {/* Hero Banner */}
        <div className="relative h-64 sm:h-80 md:h-[420px] overflow-hidden bg-muted">
          <AnimatePresence mode="wait">
            <motion.div
              key={heroSlide}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              <img
                src={banners[heroSlide].image}
                alt={banners[heroSlide].title}
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-r ${banners[heroSlide].color}`}
              />
            </motion.div>
          </AnimatePresence>

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col justify-end pb-10 px-6 sm:px-12 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`txt-${heroSlide}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white drop-shadow-lg leading-tight">
                  {banners[heroSlide].title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/80 max-w-md">
                  {banners[heroSlide].subtitle}
                </p>
                <button
                  onClick={() => navigate("/rooms")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-lg"
                >
                  {banners[heroSlide].cta}{" "}
                  <ArrowRight size={15} />
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide dots */}
          <div className="absolute bottom-4 right-6 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                className={`rounded-full transition-all ${i === heroSlide ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
              />
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-primary text-white">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-center gap-8 flex-wrap text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Building2 size={14} />{" "}
              {
                rooms.filter((r) => r.status === "available")
                  .length
              }{" "}
              phòng còn trống
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={14} />{" "}
              {new Set(rooms.map((r) => r.district)).size}{" "}
              quận/huyện
            </span>
            <span className="flex items-center gap-2">
              <Users size={14} /> 2,400+ người đã thuê
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 space-y-12">
          {/* Category quick filters */}
          <div>
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {[
                {
                  label: "Tất cả",
                  icon: <Home size={14} />,
                  action: () => {
                    resetFilters();
                    navigate("/rooms");
                  },
                },
                {
                  label: "Còn trống",
                  icon: <CheckCircle size={14} />,
                  action: () => {
                    updateFilter({ status: "available" });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Giá rẻ",
                  icon: <Percent size={14} />,
                  action: () => {
                    updateFilter({ priceMax: 2500000 });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Máy lạnh",
                  icon: <Wind size={14} />,
                  action: () => {
                    updateFilter({ amenities: ["ac"] });
                    navigate("/rooms");
                  },
                },
                {
                  label: "WC riêng",
                  icon: <Bath size={14} />,
                  action: () => {
                    updateFilter({ amenities: ["private_wc"] });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Có bếp",
                  icon: <UtensilsCrossed size={14} />,
                  action: () => {
                    updateFilter({ amenities: ["kitchen"] });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Nuôi thú",
                  icon: <PawPrint size={14} />,
                  action: () => {
                    updateFilter({
                      amenities: ["pet_friendly"],
                    });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Ban công",
                  icon: <Home size={14} />,
                  action: () => {
                    updateFilter({ amenities: ["balcony"] });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Quận 1",
                  icon: <MapPin size={14} />,
                  action: () => {
                    updateFilter({ district: "Quận 1" });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Quận 7",
                  icon: <MapPin size={14} />,
                  action: () => {
                    updateFilter({ district: "Quận 7" });
                    navigate("/rooms");
                  },
                },
                {
                  label: "Bình Thạnh",
                  icon: <MapPin size={14} />,
                  action: () => {
                    updateFilter({ district: "Bình Thạnh" });
                    navigate("/rooms");
                  },
                },
              ].map(({ label, icon, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-all shadow-sm"
                >
                  <span className="text-primary">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured rooms */}
          {featuredRooms.length > 0 && (
            <Section
              title="Phòng nổi bật"
              icon={
                <Star
                  size={16}
                  className="text-primary"
                  fill="currentColor"
                />
              }
              onMore={() => {
                updateFilter({ status: "available" });
                navigate("/rooms");
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredRooms.slice(0, 3).map((r) => (
                  <MemoRoomCard
                    key={r.id}
                    room={r}
                    onView={viewRoom}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.has(r.id)}
                    distance={distances[r.id]}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Near you */}
          {!userLocation ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Navigation
                  size={24}
                  className="text-primary"
                />
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  Phòng gần bạn
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cho phép truy cập vị trí để xem phòng gần nhất
                  với khoảng cách thực tế
                </p>
              </div>
              <button
                onClick={requestLocation}
                className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
              >
                Cho phép
              </button>
            </div>
          ) : (
            nearRooms.length > 0 && (
              <Section
                title="Phòng gần bạn"
                icon={
                  <Navigation
                    size={16}
                    className="text-primary"
                  />
                }
                onMore={() => navigate("/rooms")}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearRooms.slice(0, 3).map((r) => (
                    <MemoRoomCard
                      key={r.id}
                      room={r}
                      onView={viewRoom}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favorites.has(r.id)}
                      distance={distances[r.id]}
                    />
                  ))}
                </div>
              </Section>
            )
          )}

          {/* New */}
          {newRooms.length > 0 && (
            <Section
              title="Mới đăng"
              icon={
                <Bell size={16} className="text-blue-500" />
              }
              onMore={() => navigate("/rooms")}
            >
              <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                {newRooms.map((r) => (
                  <div key={r.id} className="w-72 shrink-0">
                    <MemoRoomCard
                      room={r}
                      onView={viewRoom}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favorites.has(r.id)}
                      distance={distances[r.id]}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Cheap */}
          {cheapRooms.length > 0 && (
            <Section
              title="Phòng giá rẻ"
              icon={
                <Percent
                  size={16}
                  className="text-emerald-500"
                />
              }
              onMore={() => {
                updateFilter({ priceMax: 2500000 });
                navigate("/rooms");
              }}
            >
              <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                {cheapRooms.map((r) => (
                  <div key={r.id} className="w-72 shrink-0">
                    <MemoRoomCard
                      room={r}
                      onView={viewRoom}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favorites.has(r.id)}
                      distance={distances[r.id]}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* All rooms preview */}
          <Section
            title="Tất cả phòng trống"
            icon={
              <Building2 size={16} className="text-primary" />
            }
            onMore={() => navigate("/rooms")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms
                .filter((r) => r.status === "available")
                .slice(0, 6)
                .map((r) => (
                  <MemoRoomCard
                    key={r.id}
                    room={r}
                    onView={viewRoom}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.has(r.id)}
                    distance={distances[r.id]}
                  />
                ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                  <Building2 size={16} className="text-white" />
                </div>
                <span className="text-lg font-extrabold">
                  Trọ<span className="text-primary">Xịn</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Nền tảng tìm phòng trọ nhanh, minh bạch, không
                qua trung gian tại TP.HCM.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm">
                Liên kết
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <button
                  onClick={goHome}
                  className="block hover:text-primary"
                >
                  Trang chủ
                </button>
                <button
                  onClick={() => navigate("/rooms")}
                  className="block hover:text-primary"
                >
                  Danh sách phòng
                </button>
                <button
                  onClick={() => {
                    navigate("/rooms");
                    setTimeout(() => setShowDemandModal(true), 0);
                  }}
                  className="block hover:text-primary"
                >
                  Kiếm phòng ngay
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm">
                Liên hệ hỗ trợ tìm phòng
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a
                  href="tel:0337244067"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Phone size={13} /> 0337244067
                </a>
                <a
                  href="https://zalo.me/0337244067"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <MessageCircle size={13} /> Zalo: Thế Vinh
                </a>
                <p className="flex items-center gap-2">
                  <MapPin size={13} /> TP. Hồ Chí Minh
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
            © 2025 TrọXịn. Tất cả quyền được bảo lưu.
          </div>
        </footer>
      </div>
    );
  };

  // ─── ROOMS LIST ──────────────────────────────────────
  const RoomsPage = () => (
    <div className="pt-14 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              Danh sách phòng
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sortedFilteredRooms.length} phòng phù hợp
            </p>
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              showFilters
                ? "bg-primary border-primary text-white"
                : "border-border text-foreground hover:border-primary"
            }`}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc
            {(filters.amenities.length > 0 ||
              filters.district !== "Tất cả" ||
              filters.status !== "all") && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                {filters.amenities.length +
                  (filters.district !== "Tất cả" ? 1 : 0) +
                  (filters.status !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filter */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="hidden lg:block shrink-0 overflow-hidden"
              >
                <div className="w-[280px] rounded-2xl border border-border bg-card p-5 sticky top-20">
                  <FilterPanel
                    filters={filters}
                    onChange={updateFilter}
                    onReset={resetFilters}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map */}
          <div className="mb-6">
            <Suspense fallback={<div className="h-[360px] bg-muted rounded-2xl animate-pulse" />}>
              <RoomMap
                rooms={sortedFilteredRooms.filter((r) => r.lat && r.lng).map((r) => ({
                  id: r.id,
                  title: r.name,
                  lat: r.lat!,
                  lng: r.lng!,
                  price: r.price,
                  address: r.address,
                  area: r.area,
                  district: r.district,
                }))}
                userLat={userLocation?.lat}
                userLng={userLocation?.lng}
                radiusKm={5}
                onViewRoom={(id) => {
                  if (rooms.find((r) => r.id === id)) viewRoom(id);
                }}
              />
            </Suspense>
          </div>

          {/* Grid */}
          <div className="flex-1">
            {roomsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
                <h3 className="font-bold text-foreground">
                  Đang tải phòng...
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Xin chờ một chút, hệ thống đang khởi động dữ liệu
                </p>
              </div>
            ) : roomsError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <AlertCircle size={28} className="text-foreground" />
                </div>
                <h3 className="font-bold text-foreground">
                  Không thể tải danh sách phòng
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {roomsError}
                </p>
                <button
                  onClick={() => setRoomsReloadKey((k) => k + 1)}
                  className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
                >
                  Thử lại
                </button>
              </div>
            ) : sortedFilteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <Search
                    size={28}
                    className="text-muted-foreground"
                  />
                </div>
                <h3 className="font-bold text-foreground">
                  Không tìm thấy phòng
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <AnimatePresence>
                  {sortedFilteredRooms.map((r) => (
                    <MemoRoomCard
                      key={r.id}
                      room={r}
                      onView={viewRoom}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favorites.has(r.id)}
                      distance={distances[r.id]}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card p-6 pb-safe max-h-[85vh] overflow-y-auto lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
              <FilterPanel
                filters={filters}
                onChange={updateFilter}
                onReset={resetFilters}
                onClose={() => setShowFilters(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── DETAIL ──────────────────────────────────────────
  const DetailPage = () => {
    const room = detailRoom!;
    const status = getStatusInfo(room.status);
    const dist = distances[room.id];
    const roomInfoItems = [
      room.area != null && {
        label: "Diện tích",
        value: `${room.area} m²`,
      },
      room.maxPeople != null && {
        label: "Số người",
        value: `Tối đa ${room.maxPeople} người`,
      },
      room.district?.trim() && {
        label: "Quận/Huyện",
        value: room.district,
      },
      room.city?.trim() && {
        label: "Thành phố",
        value: room.city,
      },
      room.views > 0 && {
        label: "Lượt xem",
        value: `${room.views.toLocaleString()} lượt`,
      },
      dist != null && {
        label: "Cách bạn",
        value:
          dist < 1
            ? `${(dist * 1000).toFixed(0)} m`
            : `${dist.toFixed(1)} km`,
      },
    ].filter(
      (item): item is { label: string; value: string } =>
        Boolean(item)
    );
    const mapsUrl = room.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.address)}`
      : `https://www.google.com/maps?q=${room.lat},${room.lng}`;
    const mapsEmbedUrl = `https://maps.google.com/maps?q=${room.lat},${room.lng}&z=16&output=embed`;
    const related = rooms
      .filter(
        (r) => r.id !== room.id && r.district === room.district,
      )
      .slice(0, 3);

    return (
      <div className="pt-14 min-h-screen">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-2 text-sm">
            <button
              onClick={goHome}
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Home size={13} /> Trang chủ
            </button>
            <ChevronRight
              size={13}
              className="text-muted-foreground"
            />
            <button
              onClick={() => navigate("/rooms")}
              className="text-muted-foreground hover:text-primary"
            >
              Danh sách phòng
            </button>
            <ChevronRight
              size={13}
              className="text-muted-foreground"
            />
            <span className="font-semibold text-foreground line-clamp-1">
              {room.name}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gallery */}
              <ImageGallery
                images={room.images}
                name={room.name}
              />

              {/* Header info */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <StatusBadge status={room.status} />
                    {room.isFeatured && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        <Star size={10} fill="currentColor" />{" "}
                        Nổi bật
                      </span>
                    )}
                    <RatingStars rating={room.rating} />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                    {room.name}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground break-words min-w-0">
                    <MapPin
                      size={14}
                      className="text-primary shrink-0"
                    />
                    <span className="break-words">{room.address}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFavorite(room.id)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                      favorites.has(room.id)
                        ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800"
                        : "border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
                    }`}
                  >
                    <Heart
                      size={14}
                      fill={
                        favorites.has(room.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                    {favorites.has(room.id) ? "Đã lưu" : "Lưu"}
                  </button>
                  <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">
                    <Share2 size={14} /> Chia sẻ
                  </button>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-bold text-foreground mb-4">
                  Chi phí hàng tháng
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Tiền thuê",
                      value: formatPriceFull(room.price),
                      highlight: true,
                    },
                    room.electricity != null && {
                      label: "Điện",
                      value: `${room.electricity.toLocaleString("vi-VN")} đ/kWh`,
                    },
                    room.water != null && {
                      label: "Nước",
                      value: formatPriceFull(room.water) + "/người",
                    },
                    room.internet != null && {
                      label: "Internet",
                      value: formatPriceFull(room.internet),
                    },
                    room.serviceFee != null && {
                      label: "Phí dịch vụ",
                      value: formatPriceFull(room.serviceFee),
                    },
                  ]
                    .filter(
                      (
                        item
                      ): item is {
                        label: string;
                        value: string;
                        highlight?: boolean;
                      } => Boolean(item)
                    )
                    .map(({ label, value, highlight }) => (
                    <div
                      key={label}
                      className={`rounded-xl p-3 ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}
                    >
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {label}
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${highlight ? "text-primary" : "text-foreground"}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details */}
              {roomInfoItems.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-bold text-foreground mb-4">
                    Thông tin phòng
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {roomInfoItems.map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl bg-muted p-3"
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {label}
                        </p>
                        <p className="text-sm font-bold text-foreground mt-0.5 break-words">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              {room.amenities.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-bold text-foreground mb-4">
                    Tiện ích
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map((a) => (
                      <AmenityBadge key={a} id={a} size="md" />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {room.description.trim() && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-bold text-foreground mb-3">
                    Mô tả
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words whitespace-pre-line">
                    {room.description}
                  </p>
                </div>
              )}

              {/* Map */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Map size={16} className="text-primary" />
                    <h2 className="font-bold text-foreground">
                      Vị trí phòng
                    </h2>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Mở Google Maps <ExternalLink size={11} />
                  </a>
                </div>
                <div className="relative h-64 bg-muted">
                  {room.lat && room.lng ? (
                    <Suspense fallback={<div className="h-full bg-muted animate-pulse" />}>
                      <RoomMap
                        rooms={[{ id: room.id, title: room.name, lat: room.lat, lng: room.lng, price: room.price, address: room.address, area: room.area, district: room.district }]}
                        userLat={userLocation?.lat}
                        userLng={userLocation?.lng}
                        radiusKm={5}
                        height="256px"
                        variant="detail"
                      />
                    </Suspense>
                  ) : (
                    <iframe
                      src={mapsEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Vị trí phòng"
                    />
                  )}
                </div>
                <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground break-words">
                      {room.address}
                    </p>
                    {dist != null && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Navigation
                          size={11}
                          className="text-primary"
                        />
                        Cách bạn{" "}
                        {dist < 1
                          ? `${(dist * 1000).toFixed(0)}m`
                          : `${dist.toFixed(1)}km`}
                        <Clock size={11} className="ml-2" />~
                        {Math.ceil(dist * 4)} phút xe máy
                      </p>
                    )}
                  </div>
                  <a
                    href={room.address
                      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(room.address)}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${room.lat},${room.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors"
                  >
                    <Navigation size={12} /> Chỉ đường
                  </a>
                </div>
              </div>

              {/* Related */}
              {related.length > 0 && (
                <div>
                  <h2 className="font-bold text-foreground mb-4">
                    Phòng tương tự tại {room.district}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {related.map((r) => (
                      <MemoRoomCard
                        key={r.id}
                        room={r}
                        onView={viewRoom}
                        onToggleFavorite={toggleFavorite}
                        isFavorite={favorites.has(r.id)}
                        distance={distances[r.id]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky contact card */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                {/* Price card */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-primary">
                      {formatPrice(room.price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /tháng
                    </span>
                  </div>
                  {(room.area != null || room.maxPeople != null) && (
                    <p className="text-xs text-muted-foreground mb-4">
                      {[
                        `${formatPriceFull(room.price)}/tháng`,
                        room.area != null && `${room.area}m²`,
                        room.maxPeople != null &&
                          `${room.maxPeople} người`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  <StatusBadge status={room.status} />

                  {room.status === "available" && (
                    <div className="mt-4 space-y-2">
                      <a
                        href={`tel:${room.phone}`}
                        onClick={() => handleContact(room)}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-lg"
                      >
                        <Phone size={16} />
                        Gọi ngay · {room.phone}
                      </a>
                      <a
                        href={room.zaloLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleContact(room)}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-blue-500 bg-blue-50 py-3 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400"
                      >
                        <MessageCircle size={16} />
                        Chat Zalo
                      </a>
                      {contactedRooms.has(room.id) && (
                        <p className="text-center text-xs text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle size={11} /> Đã liên hệ
                          chủ trọ
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Lượt xem",
                        value: room.views,
                        icon: <Eye size={14} />,
                      },
                      {
                        label: "Liên hệ",
                        value: room.contacts,
                        icon: <Phone size={14} />,
                      },
                    ].map(({ label, value, icon }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1"
                      >
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {icon} {label}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location note */}
                {!userLocation && (
                  <button
                    onClick={requestLocation}
                    className="w-full flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary font-semibold hover:bg-primary/10 transition-colors"
                  >
                    <Navigation size={16} /> Bật vị trí để xem
                    khoảng cách
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin UI removed (managed by database/admin-app)

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen bg-background"
      style={{
        fontFamily:
          "var(--font-family, 'Plus Jakarta Sans', sans-serif)",
      }}
    >
      {Header()}

      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {HomePage()}
          </motion.div>
        )}
        {view === "rooms" && (
          <motion.div
            key="rooms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {RoomsPage()}
          </motion.div>
        )}
        {view === "detail" && detailRoom && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {DetailPage()}
          </motion.div>
        )}
        {view === "favorites" && (
          <motion.div
            key="favorites"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pt-14 min-h-screen">
              <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => navigate("/rooms")}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h1 className="text-xl font-extrabold text-foreground">Phòng đã thích</h1>
                    <p className="text-sm text-muted-foreground">{favorites.size} phòng</p>
                  </div>
                </div>
                {favorites.size === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Heart size={48} className="text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Bạn chưa thích phòng nào.</p>
                    <button onClick={() => navigate("/rooms")} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
                      Xem danh sách phòng
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.filter((r) => favorites.has(r.id)).map((r) => (
                      <div
                        key={r.id}
                        onClick={() => viewRoom(r.id)}
                        className="cursor-pointer rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
                      >
                        {r.images?.[0] && (
                          <img src={r.images[0]} alt={r.name} className="w-full h-40 object-cover rounded-xl mb-3" />
                        )}
                        <h3 className="font-bold text-foreground">{r.name}</h3>
                        <p className="text-sm text-muted-foreground">{r.address}</p>
                        <p className="text-primary font-bold mt-1">{r.price.toLocaleString("vi-VN")} VNĐ/tháng</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        {view === "detail" && !detailRoom && (
          <motion.div
            key="detail-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-32 min-h-screen px-4"
          >
            <div className="mx-auto max-w-md flex flex-col items-center text-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                {detailLoading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Building2 size={28} className="text-muted-foreground" />
                )}
              </div>
              <h2 className="font-bold text-foreground">
                {detailLoading
                  ? "Đang tải thông tin phòng..."
                  : detailError === "not_found"
                    ? "Không tìm thấy phòng này."
                    : detailError
                      ? "Không thể tải thông tin phòng"
                      : "Đang tải thông tin phòng..."}
              </h2>
              <p className="text-sm text-muted-foreground">
                {detailLoading
                  ? "Xin chờ một chút, hệ thống đang lấy dữ liệu phòng."
                  : detailError === "not_found"
                    ? "Phòng có thể đã bị xóa hoặc liên kết không đúng."
                    : detailError
                      ? detailError
                      : "Xin chờ một chút, hệ thống đang lấy dữ liệu phòng."}
              </p>
              {detailError && detailError !== "not_found" && (
                <button
                  onClick={() => setDetailReloadKey((k) => k + 1)}
                  className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
                >
                  Thử lại
                </button>
              )}
              <button
                onClick={() => navigate("/rooms")}
                className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                Xem danh sách phòng
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDemandMenu && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowDemandMenu(false)}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-extrabold text-foreground">Nhu cầu phòng</h2>
                <button onClick={() => setShowDemandMenu(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Đóng"><X size={17} /></button>
              </div>
              <div className="grid gap-2">
                <button
                  onClick={() => { setShowDemandMenu(false); setShowDemandListModal(true); void loadDemands(); }}
                  className="rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Xem danh sách nhu cầu <span className="ml-1 text-xs text-muted-foreground">({demands.length})</span>
                </button>
                <button
                  onClick={() => { setShowDemandMenu(false); setShowDemandModal(true); }}
                  className="rounded-xl bg-primary px-4 py-3 text-left text-sm font-bold text-white hover:opacity-90"
                >
                  Tạo nhu cầu phòng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDemandListModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowDemandListModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-3xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Danh sách nhu cầu phòng</h2>
                  <p className="text-sm text-muted-foreground">Số điện thoại chỉ hiển thị trong admin.</p>
                </div>
                <button onClick={() => setShowDemandListModal(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Đóng"><X size={18} /></button>
              </div>
              <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
                {demandsLoading && <p className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">Đang tải nhu cầu...</p>}
                {demandsError && !demandsLoading && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700"><p>{demandsError}</p><button onClick={loadDemands} className="mt-2 underline">Thử lại</button></div>}
                {!demandsLoading && !demandsError && demands.length === 0 && <p className="rounded-xl bg-muted p-5 text-center text-sm text-muted-foreground">Chưa có nhu cầu phòng nào.</p>}
                {!demandsLoading && !demandsError && demands.map((d) => (
                  <article key={d.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-foreground">{d.district || 'Chưa xác định khu vực'}</strong>
                      {d.max_price > 0 && <span className="text-xs font-semibold text-primary">≤ {Number(d.max_price).toLocaleString('vi-VN')} VNĐ</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{d.people_count || 1} người{d.gender ? ` · ${d.gender}` : ''}</p>
                    {d.note && <p className="mt-1 text-sm text-foreground">{d.note}</p>}
                    <a
                      href="https://zalo.me/0337244067"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                    >
                      Liên hệ môi giới
                    </a>
                  </article>
                ))}
              </div>
              <button onClick={() => { setShowDemandListModal(false); setShowDemandModal(true); }} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">Tạo nhu cầu phòng</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDemandModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowDemandModal(false); setDemandError(""); }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Biểu mẫu nhu cầu phòng</h2>
                  <p className="text-sm text-muted-foreground">Điền nhu cầu để chủ trọ liên hệ bạn.</p>
                </div>
                <button onClick={() => { setShowDemandModal(false); setDemandError(""); }} className="rounded-full p-2 hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
              {demandError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {demandError}
                </div>
              )}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDemandInputMode("form")}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    demandInputMode === "form"
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  📋 Nhập form
                </button>
                <button
                  type="button"
                  onClick={() => setDemandInputMode("text")}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    demandInputMode === "text"
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  🤖 Nhập tự do (AI phân tích)
                </button>
              </div>
              {demandInputMode === "form" && (
                <form onSubmit={submitDemand} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={demandForm.full_name} onChange={(e) => setDemandForm((s) => ({ ...s, full_name: e.target.value }))} placeholder="Họ tên *" required className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
                  <input value={demandForm.phone} onChange={(e) => setDemandForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Số điện thoại *" required className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
                  <select value={demandForm.gender} onChange={(e) => setDemandForm((s) => ({ ...s, gender: e.target.value }))} className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm">
                    <option value="">Giới tính</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                  <select value={demandForm.district} onChange={(e) => setDemandForm((s) => ({ ...s, district: e.target.value }))} className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm">
                    <option value="">Khu vực mong muốn</option>
                    {DISTRICTS.filter((d) => d !== "Tất cả").map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input value={demandForm.max_price} onChange={(e) => setDemandForm((s) => ({ ...s, max_price: e.target.value }))} type="number" placeholder="Giá mong muốn tối đa" className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
                  <input value={demandForm.people_count} onChange={(e) => setDemandForm((s) => ({ ...s, people_count: e.target.value }))} type="number" min="1" placeholder="Số người ở" className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
                  <textarea value={demandForm.note} onChange={(e) => setDemandForm((s) => ({ ...s, note: e.target.value }))} placeholder="Nhu cầu phòng" rows={4} className="sm:col-span-2 rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button type="button" onClick={() => { setShowDemandModal(false); setDemandError(""); }} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">Đóng</button>
                    <button type="submit" disabled={demandSubmitting} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      {demandSubmitting ? "Đang gửi..." : "Gửi nhu cầu"}
                    </button>
                  </div>
                </form>
              )}
              {demandInputMode === "text" && (
                <form onSubmit={submitDemandFromText} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Nhập nhu cầu phòng bằng văn bản tự do, ví dụ:
                    <br />
                    <span className="text-primary">"Cần phòng Q12 giá 2-4 triệu, 20m2, 2 người, nhận tháng 9"</span>
                  </p>
                  <textarea
                    value={demandText}
                    onChange={(e) => setDemandText(e.target.value)}
                    placeholder="Ví dụ: Tôi cần phòng ở Quận 12 khoảng 2 đến 4 triệu, diện tích từ 20m2, 2 người ở, có chỗ để xe và muốn chuyển vào đầu tháng 9."
                    rows={6}
                    className="w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setShowDemandModal(false); setDemandError(""); setDemandText(""); }} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">Đóng</button>
                    <button type="submit" disabled={demandSubmitting} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      {demandSubmitting ? "Đang phân tích..." : "Phân tích & Gửi"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMapModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMapModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl rounded-3xl border border-border bg-card p-4 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Bản đồ phòng trọ</h2>
                  <p className="text-sm text-muted-foreground">Xem danh sách phòng trên bản đồ kèm vị trí của bạn.</p>
                </div>
                <button onClick={() => setShowMapModal(false)} className="rounded-full p-2 hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
              <Suspense fallback={<div className="h-[70vh] rounded-2xl bg-muted animate-pulse" />}>
                <RoomMap
                  rooms={sortedFilteredRooms.filter((r) => r.lat && r.lng).map((r) => ({
                    id: r.id,
                    title: r.name,
                    lat: r.lat!,
                    lng: r.lng!,
                    price: r.price,
                    address: r.address,
                    area: r.area,
                    district: r.district,
                  }))}
                  userLat={userLocation?.lat}
                  userLng={userLocation?.lng}
                  radiusKm={5}
                  height="70vh"
                  onViewRoom={(id) => {
                    setShowMapModal(false);
                    viewRoom(id);
                  }}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HELPER: Section wrapper
// ═══════════════════════════════════════════════════════
function Section({
  title,
  icon,
  onMore,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  onMore?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-foreground">
          {icon}
          {title}
        </h2>
        {onMore && (
          <button
            onClick={onMore}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Xem tất cả <ChevronRight size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
