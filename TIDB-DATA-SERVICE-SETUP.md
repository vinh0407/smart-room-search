# TiDB Cloud Data Service — Setup cho Smart Room Search

Thay thế kết nối mysql2 trên Cloudflare Workers bằng HTTPS API của TiDB Cloud **Data Service**.

```
Vercel FE → Cloudflare Worker → HTTPS → TiDB Data Service → TiDB Cloud → smart_room_db
```

> **Lưu ý quan trọng**: Data Service là tính năng PREVIEW của TiDB Cloud (cần cluster Starter/Serverless trên AWS). Nếu dashboard của bạn **không có mục "Data Service"**, DỪNG LẠI và báo lại — khi đó dùng phương án Node backend thay thế.

---

## Bước 1 — Tạo Data App

1. Đăng nhập [TiDB Cloud console](https://tidbcloud.com) → cluster **Vinh** → tab **Data Service**.
2. **Create Data App** → App name: `smart-room-api` → Create.
3. Mở Data App vừa tạo → copy **App ID** (dạng `{app_id}`) và ghi nhớ **Region** (ví dụ `ap-southeast-1`).
   - Data Service URL cuối cùng sẽ dạng:
     `https://ap-southeast-1.data.tidbcloud.com/api/v1beta/app/{app_id}/endpoint`

## Bước 2 — Tạo API Key

Trong Data App → **API Keys** → **Create API Key** → đặt tên `worker-be`, **Scope: ReadAndWrite** (cần đủ quyền SELECT + INSERT/UPDATE/DELETE cho 23 endpoint) → lưu **Public Key** và **Private Key** (chỉ hiện 1 lần).

- **Public Key**: có thể đưa cho AI / đặt trong `wrangler.jsonc` — không phải secret.
- **Private Key**: KHÔNG gửi cho ai, KHÔNG vào GitHub. Chỉ đặt qua `npx wrangler secret put TIDB_DATA_PRIVATE_KEY` (hoặc `.dev.vars` local, đã gitignore).
- **Auth**: client (`src/config/tidbDataService.js`) gửi Basic trước; nếu server trả challenge `WWW-Authenticate: Digest` (theo Code Example chính thức `curl --digest --user`), tự tính MD5 digest và gọi lại — tương thích cả 2 kiểu.

## Bước 3 — Tạo Endpoints (23 cái)

Với MỖI endpoint: **Create Endpoint** → nhập `Path` + `Method` chính xác → dán `SQL` → Save → **Test** → OK rồi mới sang cái kế tiếp.

**Quy tắc chung khi tạo:**
- Path chứa `{id}` / `{username}` → Data Service tự nhận diện là **path parameter** (không cần khai báo riêng).
- Mọi `:ten` khác trong SQL tự trở thành **query parameter** (method GET) hoặc **body parameter** (method POST/PUT, gửi JSON).
- **Type**: để mặc định Data Service suy ra (số so với cột INT tự cast, không cần sửa).
- Không sửa schema DB. Không tạo bảng mới. Không seed.
- `GET /rooms/stats` và `GET /rooms/{id}` cùng tồn tại: Data Service ưu tiên path tĩnh — luôn gọi đúng. Nếu test `/rooms/stats` lỗi tham số → đổi path thành `/room-stats` và sửa 1 dòng trong `src/models/roomModel.js`.
- **Response format** (backend `tidbDataService.js` chuẩn hóa mọi dạng):
  - GET → mảng row (`[...]`), hoặc `{"data": [...]}`, hoặc `{"rows": [...]}`
  - POST → `{"result": [{"insert_id": N, "row_affected": 1}]}` (backend đọc `insert_id`)
  - PUT/DELETE → `{"result": [{"row_affected": N}]}` (backend đọc `row_affected`)

---

### rooms — 9 endpoints

#### 1. `list_rooms`
- **Method:** `GET` — **Path:** `/rooms`
- **SQL:**
```sql
SELECT id, title, description, address, price, area, images, status, electricity, water, internet, service_fee, max_people, district, city, lat, lng, amenities, phone, zalo_link, views, contacts, is_featured, is_new, is_cheap, rating, created_at, updated_at
FROM rooms
WHERE (:status IS NULL OR status = :status)
  AND (:district IS NULL OR district = :district)
  AND (:priceMin IS NULL OR price >= :priceMin)
  AND (:priceMax IS NULL OR price <= :priceMax)
  AND (:areaMin IS NULL OR area >= :areaMin)
  AND (:areaMax IS NULL OR area <= :areaMax)
  AND (:search IS NULL OR title LIKE CONCAT('%', :search, '%') OR address LIKE CONCAT('%', :search, '%') OR district LIKE CONCAT('%', :search, '%') OR description LIKE CONCAT('%', :search, '%'))
ORDER BY created_at DESC
```
- **Parameters (query, tất cả optional):** `status` string, `district` string, `priceMin` number, `priceMax` number, `areaMin` number, `areaMax` number, `search` string
- **Response:** mảng room (xem response format ở trên)

#### 2. `get_room`
- **Method:** `GET` — **Path:** `/rooms/{id}`
- **SQL:** `SELECT * FROM rooms WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `[]` nếu không tồn tại, ngược lại mảng 1 phần tử

#### 3. `create_room`
- **Method:** `POST` — **Path:** `/rooms`
- **SQL:**
```sql
INSERT INTO rooms (title, description, address, price, area, images, status, electricity, water, internet, service_fee, max_people, district, city, lat, lng, amenities, phone, zalo_link, views, contacts, is_featured, is_new, is_cheap, rating)
VALUES (:title, :description, :address, :price, :area, :images, :status, :electricity, :water, :internet, :serviceFee, :maxPeople, :district, :city, :lat, :lng, :amenities, :phone, :zaloLink, :views, :contacts, :isFeatured, :isNew, :isCheap, :rating)
```
- **Parameters (body JSON, bắt buộc):** `title` string, `address` string, `price` number, `area` number, `images` string (JSON array dạng text), `status` string
- **Parameters (body JSON, optional):** `description`, `electricity` number, `water` number, `internet` number, `serviceFee` number, `maxPeople` number, `district`, `city`, `lat` number, `lng` number, `amenities` string (JSON array), `phone`, `zaloLink`, `views` number, `contacts` number, `isFeatured` boolean, `isNew` boolean, `isCheap` boolean, `rating` number
- **Response:** `insert_id` (id phòng mới)

#### 4. `update_room`
- **Method:** `PUT` — **Path:** `/rooms/{id}`
- **SQL:**
```sql
UPDATE rooms SET
  title = IF(:title IS NOT NULL, :title, title),
  description = IF(:description IS NOT NULL, :description, description),
  address = IF(:address IS NOT NULL, :address, address),
  price = IF(:price IS NOT NULL, :price, price),
  area = IF(:area IS NOT NULL, :area, area),
  status = IF(:status IS NOT NULL, :status, status),
  images = IF(:images IS NOT NULL, :images, images),
  electricity = IF(:electricity IS NOT NULL, :electricity, electricity),
  water = IF(:water IS NOT NULL, :water, water),
  internet = IF(:internet IS NOT NULL, :internet, internet),
  service_fee = IF(:serviceFee IS NOT NULL, :serviceFee, service_fee),
  max_people = IF(:maxPeople IS NOT NULL, :maxPeople, max_people),
  district = IF(:district IS NOT NULL, :district, district),
  city = IF(:city IS NOT NULL, :city, city),
  lat = IF(:lat IS NOT NULL, :lat, lat),
  lng = IF(:lng IS NOT NULL, :lng, lng),
  amenities = IF(:amenities IS NOT NULL, :amenities, amenities),
  phone = IF(:phone IS NOT NULL, :phone, phone),
  zalo_link = IF(:zaloLink IS NOT NULL, :zaloLink, zalo_link),
  views = IF(:views IS NOT NULL, :views, views),
  contacts = IF(:contacts IS NOT NULL, :contacts, contacts),
  is_featured = IF(:isFeatured IS NOT NULL, :isFeatured, is_featured),
  is_new = IF(:isNew IS NOT NULL, :isNew, is_new),
  is_cheap = IF(:isCheap IS NOT NULL, :isCheap, is_cheap),
  rating = IF(:rating IS NOT NULL, :rating, rating)
WHERE id = :id
```
- **Parameters:** `id` number (path); body JSON chỉ gửi field cần đổi (tất cả optional): `title`, `description`, `address`, `price` number, `area` number, `status`, `images` string, `electricity` number, `water` number, `internet` number, `serviceFee` number, `maxPeople` number, `district`, `city`, `lat` number, `lng` number, `amenities` string, `phone`, `zaloLink`, `views` number, `contacts` number, `isFeatured` boolean, `isNew` boolean, `isCheap` boolean, `rating` number
- **Response:** `row_affected` (1 = thành công, 0 = không tồn tại id)

#### 5. `delete_room`
- **Method:** `DELETE` — **Path:** `/rooms/{id}`
- **SQL:** `DELETE FROM rooms WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `row_affected`

#### 6. `update_room_status`
- **Method:** `PUT` — **Path:** `/rooms/{id}/status`
- **SQL:** `UPDATE rooms SET status = :status WHERE id = :id`
- **Parameters:** `id` number (path); body: `status` string (required, giá trị: `available` / `rented` / `maintenance`)
- **Response:** `row_affected`

#### 7. `increment_room_views`
- **Method:** `PUT` — **Path:** `/rooms/{id}/view`
- **SQL:** `UPDATE rooms SET views = views + 1 WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `row_affected`

#### 8. `increment_room_contacts`
- **Method:** `PUT` — **Path:** `/rooms/{id}/contact`
- **SQL:** `UPDATE rooms SET contacts = contacts + 1 WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `row_affected`

#### 9. `get_room_stats`
- **Method:** `GET` — **Path:** `/rooms/stats`
- **SQL:**
```sql
SELECT COUNT(*) AS total,
       SUM(status = 'available') AS available,
       SUM(status = 'rented') AS rented,
       SUM(CASE WHEN status = 'rented' THEN price ELSE 0 END) AS revenue
FROM rooms
```
- **Parameters:** không có
- **Response:** mảng 1 phần tử `[{"total": N, "available": N, "rented": N, "revenue": N}]`

---

### tenants & tenant-history — 7 endpoints

#### 10. `list_tenants`
- **Method:** `GET` — **Path:** `/tenants`
- **SQL:**
```sql
SELECT t.*, r.title AS room_title
FROM tenants t
JOIN rooms r ON t.room_id = r.id
WHERE (:roomId IS NULL OR t.room_id = :roomId)
ORDER BY t.created_at DESC
```
- **Parameters (query, optional):** `roomId` number
- **Response:** mảng tenant (có `room_title`)

#### 11. `get_tenant`
- **Method:** `GET` — **Path:** `/tenants/{id}`
- **SQL:** `SELECT * FROM tenants WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `[]` hoặc mảng 1 phần tử

#### 12. `create_tenant`
- **Method:** `POST` — **Path:** `/tenants`
- **SQL:**
```sql
INSERT INTO tenants (room_id, full_name, phone, cccd, deposit_amount, amount_given, amount_remaining, rent_price, contract_signed_date, move_in_date, start_date, end_date, people_count, contract_months, owner_name, owner_phone, payment_status, note, is_complete)
VALUES (:room_id, :full_name, :phone, :cccd, :deposit_amount, :amount_given, :amount_remaining, :rent_price, :contract_signed_date, :move_in_date, :start_date, :end_date, :people_count, :contract_months, :owner_name, :owner_phone, :payment_status, :note, :is_complete)
```
- **Parameters (body, bắt buộc):** `room_id` number, `full_name` string, `phone` string
- **Parameters (body, optional):** `cccd`, `deposit_amount` number, `amount_given` number, `amount_remaining` number, `rent_price` number, `contract_signed_date` (date string), `move_in_date`, `start_date`, `end_date`, `people_count` number, `contract_months` number, `owner_name`, `owner_phone`, `payment_status`, `note`, `is_complete` boolean
- **Response:** `insert_id`

#### 13. `update_tenant`
- **Method:** `PUT` — **Path:** `/tenants/{id}`
- **SQL:**
```sql
UPDATE tenants SET
  full_name = IF(:full_name IS NOT NULL, :full_name, full_name),
  phone = IF(:phone IS NOT NULL, :phone, phone),
  cccd = IF(:cccd IS NOT NULL, :cccd, cccd),
  deposit_amount = IF(:deposit_amount IS NOT NULL, :deposit_amount, deposit_amount),
  amount_given = IF(:amount_given IS NOT NULL, :amount_given, amount_given),
  amount_remaining = IF(:amount_remaining IS NOT NULL, :amount_remaining, amount_remaining),
  rent_price = IF(:rent_price IS NOT NULL, :rent_price, rent_price),
  contract_signed_date = IF(:contract_signed_date IS NOT NULL, :contract_signed_date, contract_signed_date),
  move_in_date = IF(:move_in_date IS NOT NULL, :move_in_date, move_in_date),
  start_date = IF(:start_date IS NOT NULL, :start_date, start_date),
  end_date = IF(:end_date IS NOT NULL, :end_date, end_date),
  people_count = IF(:people_count IS NOT NULL, :people_count, people_count),
  contract_months = IF(:contract_months IS NOT NULL, :contract_months, contract_months),
  owner_name = IF(:owner_name IS NOT NULL, :owner_name, owner_name),
  owner_phone = IF(:owner_phone IS NOT NULL, :owner_phone, owner_phone),
  payment_status = IF(:payment_status IS NOT NULL, :payment_status, payment_status),
  note = IF(:note IS NOT NULL, :note, note),
  is_complete = IF(:is_complete IS NOT NULL, :is_complete, is_complete)
WHERE id = :id
```
- **Parameters:** `id` number (path); body JSON chỉ gửi field cần đổi (tất cả optional): `full_name`, `phone`, `cccd`, `deposit_amount` number, `amount_given` number, `amount_remaining` number, `rent_price` number, `contract_signed_date`, `move_in_date`, `start_date`, `end_date`, `people_count` number, `contract_months` number, `owner_name`, `owner_phone`, `payment_status`, `note`, `is_complete` boolean
- **Response:** `row_affected`

#### 14. `delete_tenant`
- **Method:** `DELETE` — **Path:** `/tenants/{id}`
- **SQL:** `DELETE FROM tenants WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `row_affected`

#### 15. `list_tenant_history`
- **Method:** `GET` — **Path:** `/tenant-history`
- **SQL:** `SELECT * FROM tenant_history ORDER BY deleted_at DESC`
- **Parameters:** không có
- **Response:** mảng lịch sử

#### 16. `create_tenant_history`
- **Method:** `POST` — **Path:** `/tenant-history`
- **SQL:**
```sql
INSERT INTO tenant_history (tenant_id, room_id, room_title, full_name, phone, cccd, deposit_amount, rent_price, move_in_date, start_date, end_date, delete_reason, deleted_at)
VALUES (:tenant_id, :room_id, :room_title, :full_name, :phone, :cccd, :deposit_amount, :rent_price, :move_in_date, :start_date, :end_date, :delete_reason, :deleted_at)
```
- **Parameters (body):** `tenant_id` number, `room_id` number, `room_title` string, `full_name`, `phone`, `cccd`, `deposit_amount` number, `rent_price` number, `move_in_date`, `start_date`, `end_date`, `delete_reason` string, `deleted_at` (datetime string, vd `2026-08-18 00:00:00`)
- **Response:** `insert_id`

---

### demands & users — 7 endpoints

#### 17. `list_demands`
- **Method:** `GET` — **Path:** `/demands`
- **SQL:** `SELECT * FROM room_demands ORDER BY created_at DESC`
- **Parameters:** không có
- **Response:** mảng demand

#### 18. `create_demand`
- **Method:** `POST` — **Path:** `/demands`
- **SQL:**
```sql
INSERT INTO room_demands (full_name, phone, gender, district, max_price, people_count, note)
VALUES (:full_name, :phone, :gender, :district, :max_price, :people_count, :note)
```
- **Parameters (body):** `full_name` string, `phone` string, `gender` string, `district` string, `max_price` number, `people_count` number, `note` string
- **Response:** `insert_id`

#### 19. `update_demand`
- **Method:** `PUT` — **Path:** `/demands/{id}`
- **SQL:**
```sql
UPDATE room_demands SET full_name = :full_name, phone = :phone, gender = :gender, district = :district, max_price = :max_price, people_count = :people_count, note = :note
WHERE id = :id
```
- **Parameters:** `id` number (path); body: `full_name`, `phone`, `gender`, `district`, `max_price` number, `people_count` number, `note` (gửi đầy đủ — endpoint này ghi đè toàn bộ)
- **Response:** `row_affected`

#### 20. `delete_demand`
- **Method:** `DELETE` — **Path:** `/demands/{id}`
- **SQL:** `DELETE FROM room_demands WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `row_affected`

#### 21. `get_demand`
- **Method:** `GET` — **Path:** `/demands/{id}`
- **SQL:** `SELECT * FROM room_demands WHERE id = :id`
- **Parameters:** `id` number (path)
- **Response:** `[]` hoặc mảng 1 phần tử

#### 22. `get_user_by_username`
- **Method:** `GET` — **Path:** `/users/{username}`
- **SQL:** `SELECT * FROM users WHERE username = :username`
- **Parameters:** `username` string (path)
- **Response:** `[]` hoặc mảng 1 phần tử (backend dùng `password_hash` để so bcrypt khi login — không đưa password_hash ra API response)

#### 23. `create_user`
- **Method:** `POST` — **Path:** `/users`
- **SQL:** `INSERT INTO users (username, password_hash, role) VALUES (:username, :password_hash, :role)`
- **Parameters (body):** `username` string, `password_hash` string (bcrypt hash), `role` string (`admin` / `user`)
- **Response:** `insert_id`

---

## Bước 4 — Cấu hình local (.dev.vars)

Mở `Smart Room Search Website-BE/.dev.vars` (đã gitignore):

```ini
TIDB_DATA_SERVICE_URL=https://ap-southeast-1.data.tidbcloud.com/api/v1beta/app/{app_id}/endpoint
TIDB_DATA_PUBLIC_KEY=<public key>
TIDB_DATA_PRIVATE_KEY=<private key>
```

Chạy thử:
```bash
cd "Smart Room Search Website-BE"
npx wrangler dev
# http://127.0.0.1:8787/health        → dbMode: "tidb-data-service"
# http://127.0.0.1:8787/api/health/db → {"status":"ok","database":"connected"}
# http://127.0.0.1:8787/api/rooms      → danh sách phòng thật từ TiDB
```

## Bước 5 — Deploy lên Cloudflare

```bash
npx wrangler secret put TIDB_DATA_PUBLIC_KEY   # → Public Key
npx wrangler secret put TIDB_DATA_PRIVATE_KEY  # → Private Key (KHÔNG để lộ)
```

Trong `wrangler.jsonc` → `vars.TIDB_DATA_SERVICE_URL` — thay `YOUR_REGION` / `YOUR_APP_ID` bằng giá trị thật (đây là URL công khai, không phải secret):

```jsonc
"TIDB_DATA_SERVICE_URL": "https://ap-southeast-1.data.tidbcloud.com/api/v1beta/app/{app_id}/endpoint"
```

Sau đó:
```bash
npx wrangler deploy
```

> Secrets cần đủ trên Worker: `JWT_SECRET` (đã set), `TIDB_DATA_PUBLIC_KEY`, `TIDB_DATA_PRIVATE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## Giới hạn đã biết (đã xử lý trong code)

- **Không transaction**: Data Service mỗi endpoint = 1 câu SQL. Tạo/xóa khách thuê giờ là nhiều lệnh tuần tự (INSERT tenant → PUT room status). Nếu bước sau lỗi, bước trước đã commit — dữ liệu vẫn nhất quán ở mức chấp nhận được (phòng có thể giữ trạng thái cũ).
- **Timeout**: mỗi request Data Service có timeout 15s → trả HTTP 504 JSON (không treo request).
- **Auth 401**: trả JSON rõ ràng "authentication failed" (kiểm tra Public/Private Key).
- **PUT theo trường**: dùng `IF(:param IS NOT NULL, :param, column)` để chỉ cập nhật field được gửi (không ghi đè trường khác). Ngoại lệ: `update_demand` ghi đè toàn bộ (giống behavior cũ).
- **Không fallback**: trên Workers nếu thiếu cấu hình Data Service → API trả lỗi JSON rõ ràng (500), không mock, không in-memory.
- **Node local** (`npm run dev`, port 4000): vẫn dùng mysql2 + `uploads/` như cũ (không cần Data Service), hoặc set TIDB_* trong `.env` nếu muốn chạy Node qua Data Service.