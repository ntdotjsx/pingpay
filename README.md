<div align="center">
    <img src="https://scontent.fkkc1-1.fna.fbcdn.net/v/t39.30808-1/571236865_1130441932610307_8397102613457947618_n.jpg?stp=c0.0.1070.1070a_dst-jpg_tt6&cstp=mx1070x1070&ctp=s200x200&_nc_cat=100&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=z-rw1zdrtZwQ7kNvwFLidIw&_nc_oc=Adq4W5t1gu-9npVqSbvrvgCBCb1OKhs5ZWyhrbNhlW3d4-fRvAMS5zEtozeRkgXLAYE&_nc_zt=24&_nc_ht=scontent.fkkc1-1.fna&_nc_gid=EAnW_4ihUK2WYxqeQFu7ug&_nc_ss=7b2a8&oh=00_Af_R_e47zY2kGvBS7aND6s_pN6amYvido17Pj6XdQA-YSw&oe=6A2A3C40" alt="antigravity-usage logo" width="150" height="150" style="border-radius: 10%">
    <h1>pingpay by กลุ่ม 2 เว้ย</h1>
</div>


เนื่องจากว่าเพื่อนในกลุ่มเรานั้น มีการยืมเงินกันบ่อยๆ แล้วเกิดเหตุการณ์ลืมว่าเคยยืมเงิน หรือ ยืมไปกี่บาท จึงได้สร้างโปรเจคนี้ขึ้นมาเพื่อย้ำเตือน

# 💸 PingPay

> ระบบจัดการหนี้ระหว่างเพื่อน แจ้งเตือนผ่าน LINE อัตโนมัติ เพราะ "ลืมว่าเคยยืม" ไม่ใช่ข้อแก้ตัวอีกต่อไป

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5.x-FF5D01?logo=astro&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.x-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-11.x-FF2D20?logo=laravel&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Drone CI](https://img.shields.io/badge/CI%2FCD-Drone-212121?logo=drone&logoColor=white)
![LINE Login](https://img.shields.io/badge/Auth-LINE_Login-00C300?logo=line&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 สารบัญ

- [แรงบันดาลใจ](#-แรงบันดาลใจ)
- [ฟีเจอร์](#-ฟีเจอร์)
- [สถาปัตยกรรมระบบ](#-สถาปัตยกรรมระบบ)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [ความต้องการของระบบ](#️-ความต้องการของระบบ)
- [ติดตั้งและรันในเครื่อง (Local Development)](#️-ติดตั้งและรันในเครื่อง-local-development)
- [ตั้งค่า LINE Login](#-ตั้งค่า line-login)
- [ตั้งค่า LINE Notify](#-ตั้งค่า-line-notify)
- [Docker & Deployment](#-docker--deployment)
- [CI/CD Pipeline (Drone)](#-cicd-pipeline-drone)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Contributors](#-contributors)
- [License](#-license)

---

## 💡 แรงบันดาลใจ

เพื่อนในกลุ่มยืมเงินกันบ่อยมาก แล้วเกิดปัญหา **ลืมว่าเคยยืม** หรือ **ยืมไปเท่าไหร่** จึงสร้าง PingPay ขึ้นมาเพื่อแก้ปัญหานี้โดยเฉพาะ ระบบจะคอยส่งแจ้งเตือนผ่าน LINE ให้อัตโนมัติ ไม่ต้องไปทวงเองให้เขิน

---

## ✨ ฟีเจอร์

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| 🔐 ล็อกอินด้วย LINE | ไม่ต้องสมัครสมาชิกใหม่ กดเข้าใช้งานได้ทันทีผ่าน LINE Login |
| 👥 เพิ่มเพื่อนด้วย LINE ID | ระบบเชื่อมต่อ LINE ID เพื่อส่งการแจ้งเตือนตรงไปยังเพื่อนได้เลย |
| 📅 ตั้งวันครบกำหนดชำระ | กำหนดวันนัดชำระ ระบบจะแจ้งเตือนอัตโนมัติเมื่อใกล้ถึงกำหนด |
| 🏷️ หนี้รายบุคคล | บันทึกหนี้แบบ 1:1 ระบุจำนวนเงินและเหตุผลได้ |
| 👨‍👩‍👧‍👦 หนี้แบบกลุ่ม | สร้างกลุ่มและแชร์ค่าใช้จ่ายร่วมกัน ระบบหารเฉลี่ยให้อัตโนมัติ |
| 🔗 Copy ลิงก์ชำระเงิน | สร้างลิงก์ชำระเฉพาะคน ส่งให้เพื่อนกดชำระได้โดยไม่ต้องมีบัญชี |
| 🔔 แจ้งเตือนผ่าน LINE Notify | ส่ง push notification ตรงไปที่ LINE ของเพื่อนอัตโนมัติ |

---

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│         Astro + TypeScript (client/)         │
└──────────────────┬──────────────────────────┘
                   │ HTTP / REST API
┌──────────────────▼──────────────────────────┐
│            Laravel API (server/)             │
│         PHP 8.x + MySQL + Queue             │
└──────┬───────────────────────┬──────────────┘
       │                       │
┌──────▼──────┐       ┌────────▼────────┐
│  LINE Login │       │  LINE Notify    │
│  OAuth 2.0  │       │  Push Message   │
└─────────────┘       └─────────────────┘
```

---

## 📁 โครงสร้างโปรเจกต์

```
pingpay/
├── client/                  # Frontend — Astro + TypeScript
│   ├── src/
│   │   ├── pages/           # หน้าต่างๆ ของแอป
│   │   ├── components/      # Reusable UI components
│   │   ├── layouts/         # Layout templates
│   │   └── lib/             # Utility functions / API client
│   ├── public/              # Static assets
│   ├── Dockerfile           # Docker image สำหรับ frontend
│   └── package.json
│
├── server/                  # Backend — Laravel (PHP)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/ # API Controllers
│   │   │   └── Middleware/  # Auth middleware
│   │   ├── Models/          # Eloquent models
│   │   └── Services/        # Business logic (LINE Notify, etc.)
│   ├── database/
│   │   └── migrations/      # Database migrations
│   ├── routes/
│   │   └── api.php          # API routes
│   ├── Dockerfile           # Docker image สำหรับ backend
│   └── composer.json
│
├── docker-compose.yml       # Docker Compose สำหรับ deploy
├── .drone.yml               # CI/CD pipeline (Drone CI)
└── README.md
```

---

## 🖥️ ความต้องการของระบบ

### สำหรับ Local Development

| รายการ | Version |
|--------|---------|
| Node.js | >= 20.x |
| PHP | >= 8.1 |
| Composer | >= 2.x |
| MySQL | >= 8.0 |
| LINE Developers Account | - |

### สำหรับ Deploy ด้วย Docker

| รายการ | Version |
|--------|---------|
| Docker | >= 24.x |
| Docker Compose | >= 2.x |

---

## ⚙️ ติดตั้งและรันในเครื่อง (Local Development)

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/ntdotjsx/pingpay.git
cd pingpay
git checkout hello-world
```

### 2. ติดตั้ง Backend (Laravel)

```bash
cd server
composer install
cp .env.example .env
php artisan key:generate
```

ตั้งค่าฐานข้อมูลใน `server/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pingpay
DB_USERNAME=root
DB_PASSWORD=your_password
```

รัน migration:

```bash
php artisan migrate
php artisan db:seed   # (ถ้ามี seeder)
```

เริ่มรัน backend server:

```bash
php artisan serve
# รันที่ http://localhost:8000
```

### 3. ติดตั้ง Frontend (Astro)

```bash
cd ../client
npm install
cp .env.example .env
```

เริ่มรัน frontend server:

```bash
npm run dev
# รันที่ http://localhost:4321
```

> [!NOTE]
> Frontend จะ proxy API calls ไปยัง backend ที่ `http://localhost:8000` โดยอัตโนมัติ ตรวจสอบ config ใน `astro.config.mjs`

---

## 🔐 ตั้งค่า LINE Login

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง **Provider** ใหม่ (ถ้ายังไม่มี)
3. สร้าง **Channel** ประเภท **LINE Login**
4. ไปที่แท็บ **LINE Login** → เพิ่ม Callback URL:
   ```
   http://localhost:8000/auth/line/callback   ← สำหรับ local
   https://yourdomain.com/auth/line/callback  ← สำหรับ production
   ```
5. คัดลอก **Channel ID** และ **Channel Secret** ใส่ใน `.env`:

```env
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_REDIRECT_URI=http://localhost:8000/auth/line/callback
```

---

## 🔔 ตั้งค่า LINE Notify

LINE Notify ใช้สำหรับส่งแจ้งเตือนไปยัง LINE ของผู้ใช้

1. ไปที่ [LINE Notify](https://notify-bot.line.me/my/)
2. กด **Generate token**
3. เลือก chat ที่ต้องการให้รับแจ้งเตือน
4. คัดลอก token ใส่ใน `.env`:

```env
LINE_NOTIFY_TOKEN=your_notify_token
```

> [!TIP]
> แต่ละ user ควรผูก token ของตัวเองผ่าน OAuth flow เพื่อให้รับแจ้งเตือนได้อย่างถูกต้อง

---

## 🐳 Docker & Deployment

### รันด้วย Docker Compose (Local)

```bash
# สร้าง .env จาก example
cp .env.example .env

# รัน services ทั้งหมด
docker compose up -d

# ตรวจสอบ logs
docker compose logs -f

# หยุดการทำงาน
docker compose down
```

### Services ที่รันใน Docker Compose

| Service | Port | รายละเอียด |
|---------|------|-----------|
| `frontend` | 3000 | Astro frontend |
| `backend` | 8000 | Laravel API |
| `db` | 3306 | MySQL database |

### หลัง deploy ครั้งแรก

```bash
# รัน migration
docker compose exec backend php artisan migrate --force

# Clear cache
docker compose exec backend php artisan optimize:clear
```

---

## 🚀 CI/CD Pipeline (Drone)

โปรเจกต์ใช้ **Drone CI** สำหรับ automated build และ deploy

### ขั้นตอนของ Pipeline

```
push to hello-world branch
        │
        ▼
┌───────────────┐    ┌────────────────┐
│ build-backend │    │ build-frontend │
│ (parallel)    │    │ (parallel)     │
│               │    │                │
│ Build Docker  │    │ Build Docker   │
│ image → push  │    │ image → push   │
│ to registry   │    │ to registry    │
└───────┬───────┘    └───────┬────────┘
        └──────────┬─────────┘
                   ▼
           ┌───────────────┐
           │    deploy     │
           │               │
           │ SSH to VM →   │
           │ docker compose│
           │ pull + up -d  │
           │ + migrate     │
           └───────────────┘
```

### Drone Secrets ที่ต้องตั้งค่า

| Secret Key | รายละเอียด |
|-----------|-----------|
| `deploy_host` | IP ของ server ที่ deploy |
| `deploy_user` | SSH username |
| `deploy_ssh_key` | Private SSH key สำหรับเข้าถึง server |

> [!WARNING]
> อย่า commit SSH key หรือ secret ลงใน repository โดยตรง ให้ใช้ Drone Secrets เสมอ

---

## 🔧 Environment Variables

ตัวแปรทั้งหมดที่ใช้ในโปรเจกต์:

```env
# App
APP_NAME=PingPay
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pingpay
DB_USERNAME=root
DB_PASSWORD=

# LINE Login
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_REDIRECT_URI=http://localhost:8000/auth/line/callback

# LINE Notify
LINE_NOTIFY_TOKEN=

# Frontend (client/.env)
PUBLIC_API_URL=http://localhost:8000
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | รายละเอียด |
|--------|----------|-----------|
| `GET` | `/auth/line` | เริ่ม LINE Login flow |
| `GET` | `/auth/line/callback` | Callback จาก LINE |
| `POST` | `/auth/logout` | ออกจากระบบ |

### Friends (เพื่อน)

| Method | Endpoint | รายละเอียด |
|--------|----------|-----------|
| `GET` | `/api/friends` | ดูรายชื่อเพื่อนทั้งหมด |
| `POST` | `/api/friends` | เพิ่มเพื่อนใหม่ด้วย LINE ID |
| `DELETE` | `/api/friends/{id}` | ลบเพื่อน |

### Debts (หนี้)

| Method | Endpoint | รายละเอียด |
|--------|----------|-----------|
| `GET` | `/api/debts` | ดูรายการหนี้ทั้งหมด |
| `POST` | `/api/debts` | บันทึกหนี้ใหม่ |
| `PATCH` | `/api/debts/{id}` | อัปเดตสถานะหนี้ |
| `DELETE` | `/api/debts/{id}` | ลบรายการหนี้ |

### Groups (กลุ่ม)

| Method | Endpoint | รายละเอียด |
|--------|----------|-----------|
| `GET` | `/api/groups` | ดูกลุ่มทั้งหมด |
| `POST` | `/api/groups` | สร้างกลุ่มใหม่ |
| `POST` | `/api/groups/{id}/members` | เพิ่มสมาชิกในกลุ่ม |

### Payment Link (ลิงก์ชำระ)

| Method | Endpoint | รายละเอียด |
|--------|----------|-----------|
| `POST` | `/api/debts/{id}/payment-link` | สร้างลิงก์ชำระเงิน |
| `GET` | `/pay/{token}` | หน้าชำระเงิน (public) |

---

## 👥 Contributors

| Avatar | ชื่อ | GitHub |
|--------|------|--------|
| | Thanapon Phorarmat | [@ntdotjsx](https://github.com/ntdotjsx) |
| | Wachiravit Sirimak | [@fewgg](https://github.com/fewgg) |
| | pastis | [@ZonoHa](https://github.com/ZonoHa) |

---

## 📄 License

MIT © 2026 PingPay — [ntdotjsx](https://github.com/ntdotjsx), [fewgg](https://github.com/fewgg), [ZonoHa](https://github.com/ZonoHa)