# JakiGlobal Backend (Express + SQLite) — Ready Zip

Features:
- Users table with plan/sport/subscription fields
- Signup/Login with JWT cookie
- Select sport (locks for demo/studio)
- Admin UI at `/admin` to view/override
- PayPal endpoints (stubs) and webhook receiver
- SQLite: no separate DB required

## Run (Replit or local)
```
cd server
npm i
npm run migrate
cp .env.example .env
# edit .env
npm run dev
```
Visit `http://localhost:3000/admin` for the admin dashboard.

## Frontend integration
- Allow your Vercel URL in `CORS_ORIGINS`
- Frontend calls `/api/session` to hydrate plan
- Use `/api/select-sport` after signup or plan change
