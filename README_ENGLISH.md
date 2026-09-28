# ASDATA + VTUGATE Backend (Sandbox)

This backend is designed to keep your VTUGATE API key on the server instead of inside the Android APK.

## What it currently supports

- Fetch Data Plans
- Buy Data
- VTUGATE Sandbox/Test API integration
- Basic request validation
- CORS and rate-limit protection

## Important security rule

Never put your VTUGATE API key inside the Android application and never post it publicly. Store it only in the server environment variable `VTUGATE_API_KEY`.

## 1. Install Node.js

Install Node.js 18 or newer on the server/computer where you will run the backend.

## 2. Install dependencies

Open a terminal inside the `asdata_backend` folder and run:

```bash
npm install
```

## 3. Configure the API key

Create a `.env` file from `.env.example` and set:

```env
VTUGATE_API_KEY=YOUR_TEST_API_KEY
PORT=3000
```

Use the VTUGATE **Test API Key** while developing and testing. Do not paste the key into this chat.

## 4. Start the server

Run:

```bash
npm start
```

The server will normally listen on port 3000.

## 5. Connect the Android app

The Android app should call your backend, not VTUGATE directly:

```text
ASDATA Android App
        |
        v
Your Backend
        |
        v
VTUGATE API
```

The Android app sends the selected plan information to your backend:

- `service_id`
- `plan_code`
- `phone_number`
- `amount`

The backend adds the secret VTUGATE Authorization header and sends the request to VTUGATE.

## 6. Buy Data flow

1. The app requests available plans from your backend.
2. The user selects a plan.
3. The app sends the plan's `service_id`, `plan_code`, phone number, and amount.
4. The backend calls `POST /api/v1/buydata` on VTUGATE.
5. The backend returns the result to the Android app.

Always use `service_id` and `plan_code` from the **same data-plan row**, and make sure `amount` matches that plan's catalog price.

## Sandbox testing

Use the VTUGATE Test API Key. Sandbox transactions are mocked and do not use real wallet funds or deliver real data. Follow VTUGATE's documented test-number rules when testing failures.

## Before going live

- Replace the test key with the live key only on the server.
- Use HTTPS.
- Keep `.env` out of Git/public uploads.
- Add authentication for ASDATA users.
- Add wallet, transaction records, idempotency, and admin controls before real-money transactions.
