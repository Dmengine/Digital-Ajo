# ContriPay

ContriPay is a cooperative savings and contribution platform with:

- A TypeScript/Express backend API
- A React web client (Vite)
- A React Native mobile app (Expo)

## Monorepo Structure

- `src/` -> Backend API and services
- `web/` -> Web frontend
- `mobile/` -> Expo React Native app

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB connection string
- Paystack secret key (test or live)

Optional services:

- Redis (for locks and Socket.io scaling)
- Twilio (SMS notifications)
- Cloudinary (avatar upload)

## Environment Variables (Backend)

Create a `.env` file in the repository root.

Required:

- `MONGO_URI`
- `JWT_SECRET`
- `PAYSTACK_SECRET` (or `AJOPAY_PAYSTACK_KEY`)

Recommended:

- `CORS_ORIGIN` (comma-separated origins)
- `PORT` (defaults to `3001`)
- `MOBILE_APP_RETURN_URL` (defaults to `contripay://wallet`)
- `WEBHOOK_SECRET` (or `PAYSTACK_WEBHOOK_SECRET`)

Optional:

- `REDIS_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Install Dependencies

From repo root:

```bash
npm install
```

Install web app dependencies:

```bash
cd web
npm install
```

Install mobile app dependencies:

```bash
cd ../mobile
npm install
```

## Run Locally

### 1. Backend API

From repo root:

```bash
npm run dev
```

API default base URL:

- `http://localhost:3001/api`

### 2. Web App

From `web/`:

```bash
npm run dev
```

### 3. Mobile App (Expo)

From `mobile/`:

```bash
npm start
```

The mobile API endpoint is configured in `mobile/app.json`:

- `expo.extra.apiBaseUrl`

## Tests and Typechecks

Backend tests:

```bash
npm test
```

Backend build:

```bash
npm run build
```

Mobile typecheck:

```bash
cd mobile
npx tsc --noEmit
```

## Build Android APK (Expo EAS)

From `mobile/`:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build -p android --profile preview
```

When prompted to install on emulator, choose `no` unless `adb` is configured.

After build finishes:

- Open the EAS build URL
- Download the APK artifact
- Install it on Android device

## Key Product Notes

- Group admin-only actions are enforced server-side:
	- Add member
	- Remove member
	- Invite code visibility
- Member removal is only allowed when the current round status is `completed`.
- Wallet writes use transaction/session safeguards and idempotency protections for critical flows.

## API Health Check

`GET /` returns:

```json
{ "name": "AjoPay API", "status": "ok" }
```
