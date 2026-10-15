# ContriPay

ContriPay is a coordination and reminder tool for ajo / esusu (rotating savings) groups.

**ContriPay does not hold your money. Contributions are paid directly between group members.**
The platform never collects, stores or transfers funds: there is no wallet, no deposit and no
payout from ContriPay. It records who is receiving each round and which contributions the
group admin has confirmed as paid.

It consists of:

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
- Paystack secret key (test or live), used **only** to resolve bank account names
  (`GET /bank/resolve`) and list Nigerian banks (`GET /bank`). No charges, transfers or webhooks.

Optional services:

- Redis (for locks and Socket.io scaling)
- Twilio (SMS notifications)
- Cloudinary (avatar upload)

## Environment Variables (Backend)

Create a `.env` file in the repository root.

Required:

- `MONGO_URI`
- `JWT_SECRET`
- `PAYSTACK_SECRET` (or `AJOPAY_PAYSTACK_KEY`): bank account resolve / bank list only

Recommended:

- `CORS_ORIGIN` (comma-separated origins)
- `PORT` (defaults to `3001`)

Optional:

- `REDIS_URL` (recommended in production so only one instance runs the round job)
- `CONTRIBUTION_JOB_INTERVAL_MINUTES` (default `30`)
- `CONTRIBUTION_GRACE_HOURS` (24–48, default `48`)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

`WEBHOOK_SECRET`, `PAYSTACK_WEBHOOK_SECRET` and `MOBILE_APP_RETURN_URL` are no longer used.

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

The mobile app is configured in `mobile/app.json`:

- `expo.extra.apiBaseUrl`: API endpoint
- `expo.extra.privacyUrl`: URL of the web `/privacy` page, opened from the signup consent
  checkbox (if empty, the app shows a short in-app summary instead)

## Tests and Typechecks

Backend tests (round flow tests start an in-memory MongoDB via `mongodb-memory-server`;
the first run downloads a MongoDB binary):

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

## How a round works

1. A group is created with a contribution amount, frequency and start date. Members join by
   invite until **48 hours before the start date**, when membership locks and round 1 opens.
   Groups with fewer than 2 members at that point are cancelled.
2. Payout order is the member `order` (1, 2, 3, …). In round N, the member with order N is the
   **recipient**; every other member is a **payer**.
3. Each payer sends the contribution **directly to the recipient's bank account** (shown in the
   app, confirmed via Paystack bank resolve). They can tap **"I've sent my payment"** (optional
   transfer reference). This only notifies the group admin and shows "awaiting admin
   confirmation". **It does not count as paid.**
4. **Only the group admin** (`group.createdBy`) can mark a member's contribution as paid
   (**"Confirm paid"**; `confirmedAt` / `confirmedBy` are stored). The admin can **"Undo"** a
   mistaken confirmation, which resets it to unpaid and notifies the member. Members, including
   the recipient, cannot confirm anything.
5. When the admin has confirmed every payer, the recipient is marked as having received and the
   next round opens. After the final member receives, the group is completed.

Contribution status: `pending → marked_paid` ("I've sent", not paid) `→ confirmed` (by admin),
plus `unpaid` (past due, or confirmation undone) and `defaulted` (still unconfirmed by the admin
when the grace period ends). Reliability points for on-time (+2) / late (−5) payment are awarded
when the round settles, based on whether the admin confirmed before the due date.

The background job (every 30 min) sends reminders 48h and 24h before the due date. At the due
date, unreported payments become `unpaid` and the round is paused with a grace period (default
48h). When grace ends, unconfirmed payments are marked `defaulted`: the payer's **reliability
score** drops and repeated defaults restrict the account. **No money is ever taken as a
penalty.** The round stays paused until the remaining payments are confirmed.

### Round endpoints

- `GET /api/groups/:id/rounds/current`: recipient (name + bank details, members only), amount,
  due date, confirmed progress, the viewer's own status; the per-member checklist (`payments`)
  is returned to the admin only
- `POST /api/groups/:id/rounds/current/mark-paid`: member "I've sent my payment", body
  `{ "reference"?: string }`; notifies the admin, does not count as paid
- `POST /api/groups/:id/rounds/current/confirm/:userId`: **group admin only** (403 otherwise)
- `POST /api/groups/:id/rounds/current/unconfirm/:userId`: **group admin only**; back to unpaid

### KYC

`POST /api/auth/kyc/tier1` resolves the payout bank account with Paystack and stores the account
holder name returned by the bank; it is rejected if the account can't be resolved. BVN/NIN is
**not verified**: only the last 4 digits are stored, and the UI says "details submitted".

### Data protection

Registration requires accepting the privacy notice (`consentAccepted: true`); the acceptance time
is stored as `consentAcceptedAt`. The web `/privacy` page is a **draft** pending review.

## Key Product Notes

- Group admin-only actions are enforced server-side:
	- Add member (only while membership is open)
	- Remove member
- Member removal is only allowed when the current round status is `completed`.

## API Health Check

`GET /` returns:

```json
{ "name": "AjoPay API", "status": "ok" }
```
