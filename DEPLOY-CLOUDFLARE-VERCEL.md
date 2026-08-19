# Deploy: Cloudflare Workers (BE) + Vercel (FE + Admin)

Tài liệu triển khai sản phẩm lên môi trường production (gói miễn phí).

**Kiến trúc đích**
- **Backend**: Express chạy nguyên bản trên Cloudflare Workers (`nodejs_compat`), kết nối TiDB qua **TiDB Data Service** (HTTP + Digest auth, `dbMode: tidb-data-service`), ảnh upload lưu **Cloudinary** (không dùng filesystem, không dùng R2).
- **Frontend**: Vercel — `Smart Room Search Website-FE` (React + Vite).
- **Admin**: Vercel — `Admin` (React + Vite + TypeScript).
- **Database**: TiDB Cloud `smart_room_db` (giữ nguyên, không đổi).

---

## 1. Chuẩn bị trước

- Tài khoản **Cloudflare** (miễn phí) → dashboard: dash.cloudflare.com.
- Tài khoản **Vercel** (miễn phí) → vercel.com (đăng nhập bằng GitHub để import repo nhanh).
- Repo GitHub đã có: `github.com/vinh0407/smart-room-search` (branch `main`).
- Thông tin TiDB hiện tại (đã điền sẵn trong `Smart Room Search Website-BE/.env`):
  - Host: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` — Port: `4000`
  - User: `3sp8GbvdMHx6U5K.root` — DB: `smart_room_db`
  - SSL bắt buộc.

---

## 2. Backend — Cloudflare Workers

### 2.1 Tạo tài khoản Cloudinary (lưu ảnh phòng)

1. Đăng ký miễn phí tại cloudinary.com (không cần credit card) → Dashboard → **Settings → API Keys**.
2. Lấy 3 giá trị: `Cloud name`, `API Key`, `API Secret` (ẩn hiện bằng nút Reveal).
3. Không cần tạo folder trước — Worker tự upload vào folder `smart-room/rooms`.

### 2.2 Đăng nhập Cloudflare

```bash
cd "Smart Room Search Website-BE"
npx wrangler login
```

### 2.3 Đặt secrets (không lưu trong code)

```bash
npx wrangler secret put JWT_SECRET              # → chuỗi bí mật mạnh, ví dụ: openssl rand -hex 32
npx wrangler secret put TIDB_DATA_PUBLIC_KEY    # → Public key TiDB Data Service
npx wrangler secret put TIDB_DATA_PRIVATE_KEY   # → Private key TiDB Data Service (xem TIDB-DATA-SERVICE-SETUP.md)
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
```

> `TIDB_DATA_SERVICE_URL`, `CORS_ORIGIN` đã khai báo trong `wrangler.jsonc` (vars). Không đặt lại chúng làm secret.
> Trên Workers, client tự thử Basic rồi fallback **Digest MD5** khi gặp `WWW-Authenticate: Digest` (xem `src/config/tidbDataService.js`).

### 2.4 Deploy worker

```bash
npx wrangler deploy
```

- Worker tên `smart-room-api` → URL: `https://smart-room-api.smart-room-backend.workers.dev`
- Kiểm tra: mở `https://smart-room-api.smart-room-backend.workers.dev/health` → `{"status":"ok",...}` (xem thêm `/api/health`, `/api/health/db`)

### 2.5 Cấu hình CORS (quan trọng)

Trong `wrangler.jsonc` → `vars.CORS_ORIGIN` — đổi thành 2 domain Vercel thật:

```jsonc
"CORS_ORIGIN": "https://ten-fe-cua-ban.vercel.app,https://ten-admin-cua-ban.vercel.app"
```

Sau đó `npx wrangler deploy` lại. Có thể dùng `npx wrangler secret put CORS_ORIGIN` nếu muốn đổi nhanh không cần sửa file (secret đè vars cùng tên).

> Lưu ý: gói miễn phí Workers có giới hạn CPU 10ms/request (yêu cầu I/O như MySQL/TiDB không tính CPU). Truy vấn trung bình ~100–300ms latency — phù hợp gói miễn phí.

---

## 3. Backend — local (dev / di chuyển dữ liệu)

Nếu cần chạy BE trên máy (Node 18+):

```bash
cd "Smart Room Search Website-BE"
npm install
npm run migrate:db    # tạo schema + seed vào TiDB (chạy 1 lần, đã chạy rồi)
npm run dev           # http://localhost:4000
```

- `.env` (gitignored) chứa thông tin TiDB. Xem `.env.example` nếu cần tạo mới.
- Local vẫn dùng multer + thư mục `uploads/`; **trên Workers mọi ảnh đi qua Cloudinary** (endpoint giống hệt, URL trả về dạng `https://res.cloudinary.com/...`).

---

## 4. Frontend — Vercel (Smart Room Search Website-FE)

1. Vercel → **Add New Project** → import repo `smart-room-search`.
2. **Root Directory** chọn: `Smart Room Search Website-FE` (khoảng trắng trong tên thư mục Vercel xử lý được).
3. **Framework Preset**: Vite (tự nhận). Build Command: `npm run build` — Output: `dist`.
4. **Environment Variables** (Project Settings → Environment Variables):
   - `VITE_API_URL` = `https://smart-room-api.<your-subdomain>.workers.dev/api`
5. Deploy. URL mẫu: `https://ten-fe-cua-ban.vercel.app`.

---

## 5. Admin — Vercel (Admin/)

1. Vercel → **Add New Project** → cùng repo `smart-room-search`.
2. **Root Directory** chọn: `Admin`.
3. Framework Preset: Vite. Build: `npm run build` — Output: `dist`.
4. Env: `VITE_API_URL` = `https://smart-room-api.<your-subdomain>.workers.dev/api`
   (Có thể để trống — admin có ô nhập API base trong **Cài đặt**, và hỗ trợ `?api=URL`.)
5. Deploy. Đăng nhập bằng `admin` / `123`.

---

## 6. Cập nhật CORS cuối cùng

Sau khi có 2 domain Vercel thật → sửa `CORS_ORIGIN` (mục 2.5) → `wrangler deploy` → kiểm tra:

```bash
curl -H "Origin: https://ten-fe-cua-ban.vercel.app" -I https://smart-room-api.<your-subdomain>.workers.dev/api/rooms
# phải thấy: access-control-allow-origin: https://ten-fe-cua-ban.vercel.app
```

---

## 7. Kiểm tra toàn bộ sau deploy

| Hạng mục | Cách kiểm tra |
|---|---|
| Health | `GET /health` → `{"status":"ok"}`; `GET /api/health/db` → thông tin DB (qua Data Service) |
| Danh sách phòng | `GET /api/rooms` → 200, có dữ liệu |
| Đăng nhập | `POST /api/login` {admin,123} → token |
| Upload ảnh | Admin → Sửa phòng → tải ảnh → URL dạng `https://res.cloudinary.com/.../smart-room/rooms/...` |
| Serve ảnh | Mở URL ảnh ở trên → 200, đúng content-type (CDN Cloudinary) |
| Xóa ảnh | `DELETE /api/upload/<encoded-url>` → Cloudinary destroy → 404 khi mở lại URL |
| FE tải phòng | Mở FE → thấy danh sách phòng + map |
| Admin CRUD | Tạo/sửa/xóa phòng, khách thuê, nhu cầu |
| CORS | FE + Admin gọi API xuyên domain không lỗi |

---

## 8. Lưu ý vận hành

- **Cold start**: Workers boot không chạy schema/seed (đã migrate qua `npm run migrate:db`), không test connection — chỉ tạo pool. Lần gọi đầu có thể chậm hơn chút; FE đã có màn "Xin chờ một chút..." + nút Thử lại.
- **Kết nối TiDB**: free plan giới hạn số connection — Worker dùng `connectionLimit: 5`, pool tái sử dụng trong instance. Không mở Hyperdrive (giữ đơn giản, miễn phí).
- **Ảnh**: Cloudinary folder `smart-room/rooms`, tối đa 10MB/ảnh, 12 ảnh/lần, chỉ JPG/PNG/WEBP/GIF/AVIF. Chữ ký upload/destroy = HMAC-SHA1 ký phía Worker (secret không vào frontend). Xóa phòng không tự xóa ảnh trên Cloudinary — muốn dọn: Cloudinary dashboard → Media Library → xóa asset cũ (hoặc gọi `DELETE /api/upload/<encoded-url>`).
- **Secrets đổi**: `npx wrangler secret put <TÊN>` rồi deploy lại.
- **Rollback**: Cloudflare dashboard → Workers → smart-room-api → Deployments → chọn bản cũ.
- **Node local**: vẫn hoạt động đầy đủ như trước (kèm json fallback chỉ khi thiếu cấu hình MySQL).

---

## 9. Cấu trúc thư mục sau khi dọn dẹp

```
Smart Room Search Website/
├── Admin/                            # Admin app (React + Vite + TS) → Vercel (+ android/ Capacitor)
│   └── open.bat                      # Mở Smart Room Launcher (launcher.ps1)
├── Smart Room Search Website-BE/     # Express API → Cloudflare Workers
│   ├── src/worker.js                 # Entry Workers (Cloudinary upload + Express)
│   ├── src/cloudinary.js             # Upload/delete ảnh qua Cloudinary Upload API (fetch)
│   ├── src/config/db.js              # Pool TiDB (Node local) / cấm pool trên Workers
│   ├── src/config/tidbDataService.js # Client TiDB Data Service (Digest auth)
│   ├── wrangler.jsonc                # Config Worker
│   └── .dev.vars(.example)           # Secrets local (gitignored)
├── Smart Room Search Website-FE/     # Website chính + Android app (React + Vite + Capacitor) → Vercel
├── launcher.ps1                      # Launcher UI (WinForms): BE local/online, deploy, DB
└── README.md
```

## 10. Checklist cuối

- [ ] Tạo tài khoản Cloudinary + lấy Cloud name / API Key / API Secret
- [ ] `wrangler login`
- [ ] `wrangler secret put DB_USER / DB_PASSWORD / JWT_SECRET / CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET`
- [ ] `wrangler deploy` → `/health` = mysql
- [ ] Vercel FE: root `Smart Room Search Website-FE`, `VITE_API_URL` đúng
- [ ] Vercel Admin: root `Admin`, `VITE_API_URL` đúng
- [ ] Cập nhật `CORS_ORIGIN` = 2 domain thật → deploy lại
- [ ] Test upload ảnh qua Admin (Cloudinary)
- [ ] Test FE hiển thị phòng + map