# VESD - Vietnam Emerging Student Designers

VESD la marketplace hai phia ket noi client/doanh nghiep voi designer tre Viet Nam. He thong co verified profile, portfolio, escrow payment mock, milestone, revision, checklist ban giao, dispute center, wallet, premium packages va admin dashboard.

## Tech Stack

- Client: React, Vite, TypeScript, TailwindCSS, React Router, TanStack Query, React Helmet Async, React Hook Form-ready, Zod-ready, Lucide.
- Server: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Multer, Helmet, CORS, rate limit, mongo sanitize.
- Database: MongoDB.
- Deployment-ready: Docker Compose, `.env.example`, production CORS/env.

## Folder Structure

```text
vesd/
  client/   React Vite frontend
  server/   Express MongoDB API
  shared/   reserved for shared types/constants
  task.md
  implementation_plan.md
```

## Local Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Copy env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Start MongoDB locally or use Docker:

```bash
docker compose up mongo
```

4. Seed database:

```bash
npm run seed
```

5. Run apps:

```bash
npm run dev:server
npm run dev:client
```

Client: `http://localhost:5173`  
API: `http://localhost:5000/api/v1`  
Health: `http://localhost:5000/health`

## Productivity Timer: get-shit-done

Project đã tích hợp [`get-shit-done`](https://github.com/gsd-build/get-shit-done/) ở root monorepo dưới dạng dev dependency. Đây là CLI timer đơn giản giúp chạy Pomodoro/focus session ngay trong terminal.

### Cài đặt

Nếu clone project mới, chạy:

```bash
npm install
npm run install:all
```

### Cách sử dụng

Chạy timer tuỳ ý số phút:

```bash
npm run focus -- 25
```

Hoặc dùng các script có sẵn:

```bash
npm run focus:25
npm run focus:50
```

Tuỳ chọn CLI:

```bash
npx gsd <minutes> [options]
```

- `-n`, `--notification`: bật thông báo khi hết giờ.
- `-b`, `--break`: tự chạy thêm 5 phút nghỉ sau khi hết timer.
- `-c`, `--color <color>`: đổi màu progress bar, ví dụ `red`, `yellow`, `green`, `blue`, `cyan`, `magenta`, `black`.

Ví dụ:

```bash
npx gsd 30 -n -b -c blue
```

Lưu ý: package này khá cũ và kéo theo một số dependency có cảnh báo audit; chỉ nên dùng như công cụ development/local productivity, không ảnh hưởng runtime client/server.

## Demo Accounts

- Admin: `admin@vesd.vn` / `12345678`
- Client: `client@vesd.vn` / `12345678`
- Designer: `designer@vesd.vn` / `12345678`

## Features Implemented

- Public SEO pages: Home, designer listing, designer profile, category page, pricing, help center.
- Auth: register, login, logout, me, forgot/reset mock.
- Client: dashboard, create brief, matching, agreement, escrow payment, workspace, checklist, wallet, reviews, settings.
- Designer: dashboard, profile setup, portfolio manager, requests, project workspace, earnings wallet, premium, settings.
- Admin: dashboard, users, designer verification, project management, escrow/transactions, disputes, reviews/reports, checklist, premium, settings.
- Backend business logic: escrow deposit, milestone release, refund, revision limit, checklist validation, premium expiry, verification, dispute resolution.
- Seed data: admin, 3 clients, 12 designers, 30 portfolio items, 10 projects, reviews, premium plans, checklist templates, transactions, disputes.
- SEO: dynamic Helmet metadata, canonical, OG/Twitter tags, JSON-LD, sitemap, robots.
- Security: bcrypt, JWT, role guard, resource ownership checks, helmet, CORS whitelist, auth rate limiting, Mongo sanitize, upload file size limit.

## API Overview

Base path: `/api/v1`

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- Users: `GET /users/me`, `PATCH /users/me`, `GET /admin/users`, `PATCH /admin/users/:id/status`
- Designers: `GET /designers`, `GET /designers/:idOrSlug`, `POST /designers/profile`, `PATCH /designers/profile`, `POST /designers/verification`, `GET /admin/designers/pending`, `PATCH /admin/designers/:id/verify`
- Portfolio: `POST /portfolio`, `GET /portfolio/designer/:designerId`, `PATCH /portfolio/:id`, `DELETE /portfolio/:id`
- Projects: `POST /projects`, `GET /projects/my`, `GET /projects/:id`, `PATCH /projects/:id`, invite/accept/reject/agreement/milestone/revision/complete endpoints
- Payments: `POST /payments/escrow`, `POST /payments/mock-success`, `POST /payments/release`, `POST /payments/refund`, `GET /transactions/my`, `GET /wallet/my`, `POST /withdrawals`
- Reviews: `POST /reviews`, `GET /reviews/designer/:designerId`
- Disputes: `POST /disputes`, `GET /disputes/my`, `GET /admin/disputes`, `GET /admin/disputes/:id`, `PATCH /admin/disputes/:id/resolve`
- Premium: `GET /premium/plans`, `POST /premium/subscribe`, `GET /premium/my`
- Checklist: `GET /checklists/:category`, `POST /admin/checklists`, `PATCH /admin/checklists/:id`
- Upload: `POST /uploads/image`, `POST /uploads/file`

## Testing

```bash
npm test --prefix server
npm test --prefix client
```

Manual test flow:

1. Login client demo.
2. Explore designers and open a profile.
3. Create project brief, invite designer, confirm agreement.
4. Run escrow payment mock.
5. Login designer demo, accept/request workspace, submit milestone.
6. Login client demo, request revision or approve milestone.
7. Open dispute and resolve as admin.
8. Buy premium and verify badge/status changes.

## Mocked / Production Notes

- Payment is mock-ready, not real MoMo/VNPay/Stripe.
- Upload uses local `server/uploads`; configure Cloudinary/S3 before production.
- Email forgot/reset is mocked; configure SMTP/Nodemailer before production.
- Figma pixel-perfect pass is pending because the Figma file was not readable from this environment. Export screenshots/tokens for exact matching.

## Deployment

Frontend:

- Vercel/Netlify build command: `npm run build --prefix client`
- Output: `client/dist`
- Env: `VITE_API_URL`, `VITE_APP_NAME`

Backend:

- Render/Railway/VPS start command: `npm start --prefix server`
- Env: `PORT`, `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`

Database:

- MongoDB Atlas with indexes created by Mongoose on startup.

