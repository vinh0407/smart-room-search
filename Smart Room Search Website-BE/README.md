# Smart Room Search Backend

## Cấu trúc thư mục
- src/server.js: khởi tạo Express và định nghĩa routes
- src/controllers/: xử lý request/response cho auth và rooms
- src/models/: truy cập dữ liệu và logic lưu trữ
- src/config/: cấu hình DB và dữ liệu mẫu
- src/middleware/: xác thực JWT
- sql/schema.sql: schema MySQL

## Chạy backend
1. Cài đặt dependency:
   npm install
2. Tạo file .env từ .env.example và chỉnh cấu hình MySQL nếu cần
3. Khởi động server:
   npm run dev

## API chính
- POST /api/login
- GET /api/rooms
- GET /api/rooms/:id
- POST /api/rooms
- PUT /api/rooms/:id
- DELETE /api/rooms/:id
- PUT /api/rooms/:id/status
- GET /api/rooms/stats

## Tài khoản demo
- username: admin
- password: admin123
