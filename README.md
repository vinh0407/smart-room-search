# 🏠 Smart Room Search (Trọ Xịn)

> Website + Admin + Android app tìm kiếm và quản lý phòng trọ tại **TP.HCM** — cho người thuê tìm phòng và chủ trọ quản lý phòng/khách thuê.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?logo=capacitor&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)
![TiDB Cloud](https://img.shields.io/badge/TiDB%20Cloud-00AFB9?logo=tidb&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)

---

## 🗺️ Kiến trúc

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Android App │   │ Website FE   │   │  Admin       │
│ (Capacitor)  │   │ (React+Vite) │   │ (React+Vite) │
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
| Website FE | `localhost:5173` (proxy `/api` → 4000) | Vercel — `https://smart-room-search.vercel.app` |
| Admin | `localhost:5173` (proxy `/api` → 4000) | Vercel — `https://smart-room-admin.vercel.app` |
| Backend | Node.js Express — `localhost:4000` | Cloudflare Worker — `https://smart-room-api.smart-room-backend.workers.dev` |
| Database | TiDB Cloud (MySQL) | TiDB Cloud qua **Data Service** |

> ⚡ Trên Cloudflare Workers **không dùng** mysql2 pool trực tiếp — toàn bộ truy cập DB đi qua **TiDB Data Service** (HTTP + Digest auth, tự động fallback Basic → Digest MD5). Khi chạy local Node.js có thể chọn `dbMode`: `mysql` (trực tiếp) hoặc `tidb-data-service`.

---

## ✨ Chức năng

- 🔍 Tìm kiếm & lọc phòng theo quận, giá, diện tích, tiện nghi
- 🗺️ Xem phòng trên bản đồ (Leaflet)
- ❤️ Yêu thích & lưu phòng
- 👥 Đăng nhu cầu tìm phòng
- 🏠 Quản lý phòng, khách thuê, hợp đồng
- 💰 Quản lý giá, điện, nước, dịch vụ
- 📊 Thống kê phòng & doanh thu
- 🤖 AI tạo mô tả phòng
- 📍 Geocoding địa chỉ
- 🖼️ Upload ảnh phòng (Cloudinary)
- 🔐 Đăng nhập JWT (Admin)
- 📱 Ứng dụng Android (Capacitor) dùng chung Backend & Database
- 🩺 Health check `/health`, `/api/health`, `/api/health/db`

---

## 🚀 Khởi chạy nhanh — Launcher UI

Double-click `Admin\open.bat` (hoặc `launcher.ps1`) để mở **Smart Room Launcher**:

| Nút | Chức năng |
|---|---|
| 🟢 Start/Stop BE | Chạy/tắt Backend local (Node.js, port 4000) |
| Kiem tra health | Health check BE local / worker online |
| Deploy worker | Deploy Backend lên Cloudflare Workers (`wrangler deploy`) |
| Start Admin / FE dev | Chạy dev server Vite |
| Mo Admin / FE | Mở trình duyệt |
| Cap nhat DB | Chạy `migrate-to-mysql.js` (schema + seed TiDB) |
| Mo setup doc | Mở tài liệu 23 endpoint TiDB Data Service |

Trạng thái BE/Admin/Worker hiển thị live (ON/OFF), log theo thời gian thực ở khung dưới.

---

## 🛠️ Cài đặt & phát triển

### Yêu cầu
- Node.js ≥ 20
- (Android) JDK 17 + Android SDK + Android Studio

### 1. Backend

```bash
cd "Smart Room Search Website-BE"
npm install
copy .env.example .env        # điền DB_HOST, DB_USER, DB_PASSWORD, DB_NAME...
node src/server.js            # local: http://localhost:4000
```

Kiểm tra nhanh: `http://localhost:4000/health` → `{"status":"ok"}`

**Cloudflare Worker:**

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
npx cap sync android           # đồng bộ web -> Android project
```

Production trên Vercel: đặt env `VITE_API_URL=https://smart-room-api.smart-room-backend.workers.dev/api`

### 3. Admin

```bash
cd "Smart Room Search Website-Admin"  # thư mục Admin
npm install
npm run dev                    # http://localhost:5173
npm run build
npx cap sync android           # app Android riêng (com.smartroomsearch.admin)
```

Đăng nhập mặc định: `admin / 123`

### 4. Android APK

```bash
cd "Smart Room Search Website-FE"
npm run build
npx cap sync android
npx cap open android           # build bằng Android Studio
```

### 5. Cập nhật Database (schema + seed)

```bash
cd "Smart Room Search Website-BE"
node scripts/migrate-to-mysql.js
```

Hoặc bấm **"Cap nhat DB"** trong Launcher UI.

---

## 📦 Cấu trúc repo

```
├── Smart Room Search Website-BE/   # Backend (Express + Cloudflare Worker)
│   ├── src/                        # server.js, worker.js, models/, config/
│   ├── sql/schema.sql              # schema TiDB/MySQL
│   ├── scripts/migrate-to-mysql.js # tạo schema + seed
│   └── wrangler.jsonc              # cấu hình Worker
├── Smart Room Search Website-FE/   # Website + Android app (Capacitor)
│   ├── src/app/App.tsx             # toàn bộ UI chính
│   ├── android/                    # project Android (com.smartroomsearch.app)
│   └── capacitor.config.json
├── Admin/                          # Trang quản trị + Android admin
│   ├── src/                        # login, quản lý phòng/khách thuê/...
│   ├── android/                    # project Android (com.smartroomsearch.admin)
│   └── open.bat                    # mở Smart Room Launcher
├── launcher.ps1                    # Launcher UI (WinForms)
└── TIDB-DATA-SERVICE-SETUP.md      # 23 endpoint Data Service (SQL/params/response)
```

---

## 🔐 Bảo mật

- Mật khẩu hash bằng `bcryptjs`, auth bằng JWT (`JWT_SECRET` — đặt qua `wrangler secret`)
- API key TiDB Data Service (Public/Private) chỉ tồn tại trên Cloudflare Secrets, không bao giờ trong code/repo
- CORS giới hạn đúng domain FE/Admin trên Vercel
- File `.env`, `.dev.vars`, `android/local.properties`... đã loại trừ trong `.gitignore`

---

## 📚 Tài liệu

- `TIDB-DATA-SERVICE-SETUP.md` — toàn bộ 23 endpoint TiDB Data Service (name, method, path, SQL, params, response) — **bắt buộc** khi sửa dashboard Data Service
- `Smart Room Search Website-BE/src/config/tidbDataService.js` — client Digest auth

---

## 🧑‍💻 Thông tin

- GitHub: [vinh0407/smart-room-search](https://github.com/vinh0407/smart-room-search)
- Worker API: `https://smart-room-api.smart-room-backend.workers.dev`
- Website: `https://smart-room-search.vercel.app`
- Admin: `https://smart-room-admin.vercel.app`

---

*Made with ❤️ by [vinh0407](https://github.com/vinh0407)*
