# Smart Room Search — Trọ Xịn

> Nền tảng tìm kiếm và quản lý phòng trọ tại **TP.HCM** — người thuê tìm phòng, chủ trọ quản lý phòng/khách thuê/nhu cầu. Gồm **Website + Admin Web + App Android** dùng chung một Backend API.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-2-7F52FF?logo=kotlin&logoColor=white)
![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-3DDC84?logo=android&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)
![TiDB Cloud](https://img.shields.io/badge/TiDB%20Cloud-00AFB9?logo=tidb&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)

---

## Link trực tiếp

| Thành phần | URL |
|---|---|
|  **Website người thuê** | https://smart-room-search.vercel.app |
|  **Admin Web** (quản trị) | https://smart-room-admin-ccyw8rtp6-v-c621.vercel.app |
|  **Backend API** | https://smart-room-api.smart-room-backend.workers.dev/api |
|  Health check | https://smart-room-api.smart-room-backend.workers.dev/health |

> Đăng nhập Admin: `admin / 123`

---

##  Tải App Android (APK)

| Bản | File | Kích thước |
|---|---|---|
| Smart Room Search v1.0 | [**SmartRoomSearch-v1.0.apk**](https://github.com/vinh0407/smart-room-search/raw/main/APK/SmartRoomSearch-v1.0.apk) | ~27 MB |

App Android (native **Kotlin + Jetpack Compose**) gồm đầy đủ:

-  Người thuê: danh sách phòng, lọc theo quận/giá/tiện ích, chi tiết phòng, bản đồ, yêu thích (lưu offline), đăng nhu cầu tìm phòng
-  Admin (trong app): đăng nhập, dashboard thống kê thật từ API, quản lý phòng (thêm/sửa/xóa/đổi trạng thái), quản lý khách thuê, nhu cầu — tự động lưu token

**Cài đặt:** tải file APK → mở trên điện thoại Android → cho phép "Cài đặt từ nguồn không xác định" → cài đặt. (APK debug-signed, dùng cho mục đích demo/thử nghiệm.)

---

##  Chức năng

### Website người thuê
- Tìm kiếm & lọc phòng theo quận, giá, diện tích, tiện nghi, trạng thái
- Trang chi tiết phòng đầy đủ: gallery ảnh, chi phí hàng tháng, tiện ích, mô tả, bản đồ, phòng tương tự
- Xem phòng trên bản đồ (Leaflet) + khoảng cách thực tế từ vị trí người dùng
- Yêu thích & lưu phòng (localStorage)
- Đăng nhu cầu tìm phòng cho chủ trọ liên hệ
- Gọi điện / chat Zalo trực tiếp với chủ trọ (tự ghi nhận lượt liên hệ)
- Dark mode, giao diện responsive mobile-first

### Admin Web & App
- Dashboard thống kê: tổng phòng, phòng trống, đã thuê, bảo trì, khách thuê, nhu cầu
- Quản lý phòng: thêm / sửa / xóa / đổi trạng thái (còn trống – đã thuê – bảo trì)
- **Nhập liệu thông minh (AI Data Entry)**: dán văn bản tiếng Việt tự nhiên → hệ thống tự parse ra phòng (giá, diện tích, điện/nước, phí dịch vụ, tiện ích...) hoặc lệnh sửa phòng hiện có — qua `POST /api/rooms/parse`
- Quản lý khách thuê + lịch sử thuê, quản lý nhu cầu tìm phòng
- AI tạo mô tả phòng, Geocoding địa chỉ, upload ảnh (Cloudinary)
- Indicator trạng thái Backend Online/Offline, thông báo lỗi tiếng Việt, xác nhận trước khi xóa

### Backend (chung cho mọi nền tảng)
- REST API Express — chạy local hoặc deploy lên **Cloudflare Workers**
- Auth JWT (bcryptjs), rate limit đăng nhập
- Database **TiDB Cloud** (MySQL) qua **TiDB Data Service** (HTTP + Digest auth) trên Workers
- Health check, version cache, tracking lượt xem / liên hệ

---

##  Kiến trúc

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Android App │   │ Website FE   │   │  Admin Web   │
│ Kotlin+Compose│  │ (React+Vite) │   │ (React+Vite) │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
                 ┌─────────────────┐
                 │   Backend API   │
                 │  Express (local)│
                 │  Worker (prod)  │
                 └────────┬────────┘
                          │ HTTP + Digest Auth
                          ▼
               ┌─────────────────────┐
               │ TiDB Data Service  │
               │  (TiDB Cloud)      │
               └─────────┬──────────┘
                         ▼
               ┌─────────────────────┐
               │  TiDB smart_room_db │
               └─────────────────────┘
```

| Thành phần | Local (dev) | Production |
|---|---|---|
| Website FE | `localhost:5173` (proxy `/api` → 4000) | Vercel — https://smart-room-search.vercel.app |
| Admin Web | `localhost:5173` | Vercel — https://smart-room-admin-ccyw8rtp6-v-c621.vercel.app |
| Backend | Node.js Express — `localhost:4000` | Cloudflare Worker — https://smart-room-api.smart-room-backend.workers.dev |
| Database | TiDB Cloud (MySQL trực tiếp) | TiDB Cloud qua **Data Service** |

> Trên Cloudflare Workers **không dùng** mysql2 pool trực tiếp — toàn bộ truy cập DB đi qua **TiDB Data Service** (HTTP + Digest auth, tự động fallback Basic → Digest MD5). Khi chạy local Node.js có thể chọn `dbMode`: `mysql` (trực tiếp) hoặc `tidb-data-service`.

---

##  Cấu trúc repo

```
├── Smart Room Search Website-BE/    # Backend (Express + Cloudflare Worker)
│   ├── src/
│   │   ├── server.js                # Express app (local)
│   │   ├── worker.js                # Cloudflare Worker (production)
│   │   ├── controllers/             # room, tenant, demand, auth, ai, geocode, upload, roomParse
│   │   ├── utils/roomParser.js      # AI Data Entry: parser văn bản tiếng Việt → phòng/update
│   │   ├── models/                  # roomModel, tenantModel, demandModel, userModel
│   │   └── config/                  # db, seed, tidbDataService
│   ├── sql/schema.sql               # schema TiDB/MySQL
│   ├── scripts/migrate-to-mysql.js  # tạo schema + seed
│   └── wrangler.jsonc               # cấu hình Worker
├── Smart Room Search Website-FE/    # Website người thuê (React+Vite)
│   ├── src/app/App.tsx              # toàn bộ UI chính
│   ├── vercel.json                  # SPA rewrite cho /rooms/:id
│   └── android/                     # App Android NATIVE Kotlin/Compose (com.smartroomsearch.app)
│       └── app/src/main/java/com/smartroomsearch/app/
│           ├── ui/                  # Home, Rooms, RoomDetail, Demands, Admin screens, MainViewModel
│           ├── api/                 # RetrofitClient, SmartRoomApiService
│           ├── repository/          # SmartRoomRepository, FavoriteDao (Room yêu thích offline)
│           └── model/Models.kt      # Room, Tenant, Demand, RoomStats
├── Admin/                           # Admin Web (React+Vite) — deploy Vercel riêng
│   ├── src/                         # Login, Dashboard, Rooms, Tenants, TenantHistory, Demands, Settings
│   ├── vercel.json                  # SPA rewrite
│   └── android/                     # App admin (Capacitor)
└── APK/                             # APK bản phát hành
```

---

##  Cài đặt & phát triển

### Yêu cầu
- Node.js ≥ 20 (khuyến nghị 22+)
- Android: JDK 21 + Android SDK + Android Studio

### 1. Backend

```bash
cd "Smart Room Search Website-BE"
npm install
copy .env.example .env        # điền DB_HOST, DB_USER, DB_PASSWORD, DB_NAME...
node src/server.js            # local: http://localhost:4000
```

Kiểm tra nhanh: `http://localhost:4000/health` → `{"status":"ok"}`

**Deploy Cloudflare Worker:**

```bash
npx wrangler login
npx wrangler secret put JWT_SECRET
npx wrangler secret put TIDB_DATA_PUBLIC_KEY
npx wrangler secret put TIDB_DATA_PRIVATE_KEY
npx wrangler deploy            # https://smart-room-api.smart-room-backend.workers.dev
```

### 2. Website FE

```bash
cd "Smart Room Search Website-FE"
npm install
npm run dev                    # http://localhost:5173 (proxy /api -> localhost:4000)
npm run build                  # build ra dist/
```

Production trên Vercel: đặt env `VITE_API_URL=https://smart-room-api.smart-room-backend.workers.dev/api` (đã có trong `.env.production`).

### 3. Admin Web

```bash
cd "Admin"
npm install
npm run dev                    # http://localhost:5173
npm run build
```

Đăng nhập mặc định: `admin / 123`

### 4. App Android (native)

```bash
cd "Smart Room Search Website-FE/android"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"   # hoặc JDK 21 của bạn
.\gradlew.bat assembleDebug     # APK tại android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Cập nhật Database (schema + seed)

```bash
cd "Smart Room Search Website-BE"
node scripts/migrate-to-mysql.js
```

---

## 📡 API chính

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/login` | – | Đăng nhập (admin/123) |
| GET | `/api/rooms` | – | Danh sách phòng (+ filter: status, district, priceMin/Max, areaMin/Max, search) |
| GET | `/api/rooms/:id` | – | Chi tiết phòng |
| POST | `/api/rooms/:id/view` · `/contact` | – | Track lượt xem / liên hệ |
| GET | `/api/rooms/stats` | Thống kê dashboard |
| POST | `/api/rooms` | Tạo phòng |
| PUT | `/api/rooms/:id` | Sửa phòng |
| DELETE | `/api/rooms/:id` | Xóa phòng |
| PUT | `/api/rooms/:id/status` | Đổi trạng thái (available/rented/maintenance) |
| **POST** | **`/api/rooms/parse`** | **Nhập liệu thông minh**: dán văn bản tiếng Việt → tạo/sửa phòng tự động |
| GET/POST | `/api/demands` | – | Nhu cầu tìm phòng |
| GET/POST | `/api/tenants` · `/api/tenant-history` | Khách thuê & lịch sử |
| POST | `/api/ai/room-description` | AI tạo mô tả phòng |
| GET | `/api/geocode` | Geocoding địa chỉ |
| GET | `/health` · `/api/health` · `/api/health/db` | – | Health check |

---

##  Bảo mật

- Mật khẩu hash bằng `bcryptjs`, auth bằng JWT (`JWT_SECRET` — đặt qua `wrangler secret`)
- API key TiDB Data Service (Public/Private) chỉ tồn tại trên Cloudflare Secrets, không bao giờ trong code/repo
- CORS giới hạn đúng domain FE/Admin trên Vercel (không dùng `*` với auth)
- Rate limit đăng nhập chống brute-force
- File `.env`, `.dev.vars`, `android/local.properties`, `.vercel/` đã loại trừ trong `.gitignore`

---

## Thông tin

- GitHub: [vinh0407/smart-room-search](https://github.com/vinh0407/smart-room-search)
- Website: https://smart-room-search.vercel.app
- Admin Web: https://smart-room-admin-ccyw8rtp6-v-c621.vercel.app
- API: https://smart-room-api.smart-room-backend.workers.dev
- APK: [SmartRoomSearch-v1.0.apk](https://github.com/vinh0407/smart-room-search/raw/main/APK/SmartRoomSearch-v1.0.apk)
