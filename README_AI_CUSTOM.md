# PhotoCraft AI Studio - Hướng Dẫn Sử Dụng & Tích Hợp AI

Chào mừng bạn đến với bộ tùy biến **PhotoCraft AI Studio**! Dự án này cho phép bạn sử dụng đầy đủ sức mạnh của các mô hình Generative AI (Generative Fill, Tách Nền, Mở Rộng Viền, Text-to-Image, và Trợ Lý Photoshop Copilot) trực tiếp với PhotoCraft.

---

## 🌟 1. Các Tính Năng AI Đã Tích Hợp

| Tính năng | Mô tả hoạt động |
| :--- | :--- |
| 🪄 **Generative Fill (Điền Khuyết AI)** | Dùng chuột khoanh vùng trên ảnh, nhập mô tả (ví dụ: *"chú mèo con lông vàng"*, *"chiếc siêu xe màu đỏ"*). AI sẽ vẽ và hòa trộn đối tượng vào ảnh như Photoshop. |
| ✂️ **Tách Nền Tự Động (AI Cutout)** | Tự động nhận diện người, đồ vật và tách nền trong suốt, chèn thẳng vào Layer mới trong PhotoCraft. |
| 🌅 **Generative Expand (Mở Rộng Viền)** | Tự động mở rộng 4 cạnh canvas và cho AI vẽ tiếp phong cảnh xung quanh liền mạch. |
| 🎨 **Sinh Ảnh Bằng Văn Bản (Text-to-Image)** | Sử dụng mô hình **FLUX.1 / SDXL** tạo ảnh chất lượng cao 8K theo nhiều phong cách (Chân thực, Điện ảnh, Anime, 3D Render) và đưa vào canvas. |
| 🤖 **Photoshop AI Copilot (Trợ Lý Tiếng Việt)** | Nhập lệnh tự nhiên bằng tiếng Việt (như *"tăng tương phản và độ rực rỡ"*, *"tone màu ấm vintage"*, *"làm nét chi tiết"*), trợ lý AI sẽ tự dịch thành chuỗi lệnh PhotoCraft (`Curves`, `Levels`, `Vibrance`, `Filters`) và thực thi ngay lập tức. |
| 🔌 **Hỗ Trợ MCP Server** | Sẵn sàng kết nối với Claude Desktop, Antigravity IDE hoặc các AI Agent để điều khiển PhotoCraft từ xa. |

---

## 🚀 2. Cách Khởi Động & Sử Dụng

### Cách 1: Chạy Bộ Công Cụ AI Studio (Khuyên Dùng)
Chỉ cần nhấp đúp chuột vào file:
👉 **`start-ptscraft-ai.bat`** (nằm ngay trong thư mục `ptscraft`)

- Trình duyệt sẽ tự động mở giao diện AI Studio tại: **`http://localhost:4242`**
- Bạn có thể thao tác vẽ, khoanh vùng, chọn model và xuất file `.PSD` ngay trên web.

### Cách 2: Chạy Ứng Dụng PhotoCraft Desktop Bản Cài Đặt Sẵn
👉 Nhấp đúp vào **`start-desktop.bat`** để mở giao diện Photoshop Desktop truyền thống của PhotoCraft.

### Cách 3: Chạy Phiên Bản WebAssembly Trên Trình Duyệt
👉 Nhấp đúp vào **`start-web.bat`** để mở bản Web tại **`http://localhost:8080`**.

---

## 🔒 3. Tóm Tắt Kết Quả Quét Bảo Mật (Security Audit)

- **Mã nguồn Safe Rust:** Toàn bộ engine nghiêm cấm mã không an toàn (`unsafe_code = "forbid"`). Không có nguy cơ tràn bộ đệm (Buffer Overflow).
- **Không có mã độc hay lộ khóa:** Quét 1,503 tệp tin, không có secret/token/API key hardcode.
- **Kênh điều khiển an toàn:** Mạng chỉ lắng nghe trên `127.0.0.1` (loopback-only), không mở ra mạng ngoài. Yêu cầu mã xác thực 256-bit chống tấn công kênh phụ (Timing Attack).
- **Hệ thống file cô lập:** Sử dụng `cap-std` chống tấn công duyệt thư mục (Path Traversal `../`).
- Chi tiết xem tại: [`SECURITY_AUDIT_REPORT.md`](../SECURITY_AUDIT_REPORT.md).

---

## 📁 4. Cấu Trúc Thư Mục Tùy Biến

```
ptscraft/
├── ptscraft-ai/               # Bộ điều khiển AI Companion
│   ├── server.js              # Backend Node.js kết nối PhotoCraft RPC & AI APIs
│   ├── workspace/             # Thư mục lưu trữ tệp, layer và xuất PSD
│   └── public/                # Giao diện AI Studio (HTML/CSS/JS hiện đại)
│       ├── index.html
│       ├── style.css
│       └── app.js
├── release-bin/               # Bản build chạy trực tiếp trên Windows x64
│   ├── photocraft-0.9.0-windows-x64-portable/  (photocraft.exe, photocraft-cli.exe)
│   └── photocraft-web-0.9.0/                   (Wasm & Web runner)
├── start-ptscraft-ai.bat      # File chạy 1-click bộ AI Companion
├── start-desktop.bat          # File chạy 1-click PhotoCraft Desktop
├── start-web.bat              # File chạy 1-click PhotoCraft Web
├── deploy-vps.sh              # Script tự động cài đặt & chạy PM2 trên Linux VPS
├── ecosystem.config.cjs       # Cấu hình PM2 cho /var/www/pts_spl/data/www/pts.splworks.com
├── nginx-pts.splworks.com.conf # Mẫu cấu hình Reverse Proxy cho FastPanel / Nginx
├── photocraft-mcp.json        # Cấu hình MCP server cho AI coding agents
└── SECURITY_AUDIT_REPORT.md   # Báo cáo quét bảo mật chi tiết
```

---

## 🌐 5. Hướng Dẫn Deploy Lên VPS (`/var/www/pts_spl/data/www/pts.splworks.com`)

### Lần đầu cài đặt trên VPS:
```bash
cd /var/www/pts_spl/data/www/pts.splworks.com
git clone https://github.com/Splinh19089703/photoshop.git .
bash deploy-vps.sh
```
*(Nếu thư mục đã có sẵn file mặc định của FastPanel như `index.html`, chạy `rm -rf /var/www/pts_spl/data/www/pts.splworks.com/*` trước khi `git clone`)*

### Các lần cập nhật code sau:
```bash
cd /var/www/pts_spl/data/www/pts.splworks.com
git pull origin main
bash deploy-vps.sh
```

### Cấu hình FastPanel / Nginx (`pts.splworks.com`):
- Mở cấu hình Nginx của site `pts.splworks.com` trong FastPanel, thêm nội dung từ file `nginx-pts.splworks.com.conf` (Reverse Proxy về `http://127.0.0.1:4242`).
- Truy cập:
  - **PhotoCraft AI Studio:** `https://pts.splworks.com/`
  - **PhotoCraft Web Editor (Full Wasm + AI Taskbar):** `https://pts.splworks.com/editor/`
- Mở nút **⚙️ Cài Đặt API** trên giao diện web để dán API Keys (OmniRouter / OpenRouter / Gemini); cấu hình sẽ lưu riêng trên VPS tại `ptscraft-ai/config/ai-settings.json` (không bị ghi đè khi `git pull`).
