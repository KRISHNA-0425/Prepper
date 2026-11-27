# Prepper AI — Engineering Changes & Bug Resolution Report

**Project:** Prepper (AI Interview & Career Preparation Platform)  
**Branch:** `logo-update`  
**Contributor:** Harshdeep Singh (`harshdeepsinghb13@gmail.com`)  
**Date:** November 27, 2026  

---

## Executive Summary

This document records all visual branding updates, root-cause investigations, architectural bug fixes, and automated test additions implemented on the `logo-update` branch of the **Prepper** project. Three major areas were addressed:

1. **Theme-Aware Brand Logo & Favicon Overhaul** — Replaced the static SVG logo with transparent PNG assets tailored for Light Mode and Dark Mode.
2. **Authentication Session Failure (`"Token not found"`)** — Resolved intermittent authentication failures affecting users whose browsers block third-party cookies by introducing a dual-channel JWT (`httpOnly` cookie + `Authorization: Bearer` header) mechanism.
3. **Payment Processing Failure (`"Payment cannot be processed"`)** — Fixed payment order creation, verification, idempotency, and client-side Razorpay error/state handling.

---

## 1. Theme-Aware Logo & Favicon Overhaul

### 1.1 Problem Statement
- The application previously used a single static `/logo.svg` and `/favicon.svg` with a dark background.
- It did not adapt between **Warm Light** mode and **Cyber Dark** mode, and the user-provided brand logos contained solid dark/light backgrounds that needed to be removed and converted into transparent `.png` assets.

### 1.2 Solution Implemented
1. **Background Removal & Asset Generation (Python / Pillow):**
   - Processed both uploaded brand logos to remove their solid backgrounds and export clean RGBA `.png` files with transparency:
     - `Frontend/public/logo-light.png` — Dark navy `P` emblem + `PREPPER` wordmark on a transparent background (for Light Mode).
     - `Frontend/public/logo-dark.png` — White & yellow (`#FDC700`) `P` emblem + `PREPPER` wordmark on a transparent background (for Dark Mode).
     - `Frontend/public/favicon.png` (`32×32`) and `Frontend/public/favicon-192.png` (`192×192`) — Transparent PNG favicons derived from the `P` emblem.
2. **Theme-Reactive Component:**
   - Created `Frontend/src/components/ui/ThemedLogo.jsx`, which reads `isDark` from `useTheme()` (backed by Redux `state.theme`) and renders `/logo-dark.png` in Dark Mode or `/logo-light.png` in Light Mode.
3. **Integration Across UI:**
   - Updated `Frontend/src/components/Navbar.jsx` and `Frontend/src/pages/Auth.jsx` to use `<ThemedLogo />`.
   - Updated `Frontend/index.html` to reference `/favicon.png` (`type="image/png"`).

---

## 2. Authentication Issue: `"Token not found"` After Login

### 2.1 Problem Statement
When new or returning users logged in via Google Sign-In and attempted to use their available credits/tokens for interviews, ATS analysis, or payments:
- For **some users**, everything worked normally.
- For **other users**, the UI displayed their user profile and credit balance in the Navbar, yet every protected API request failed with `"Token not found"`.

### 2.2 Root Cause Analysis
1. **Cookie-Only Authentication:** `Backend/controllers/googleAuth.controller.js` issued the JWT solely inside an `httpOnly` cookie (`res.cookie("token", token, { sameSite: "none", secure: true })` in production) and did **not** include the JWT in the JSON response.
2. **Third-Party Cookie Blocking:** In cross-origin deployments (e.g., frontend on Vercel and backend on Render), `sameSite: "none"` is treated as a third-party cookie. Browsers such as Safari (ITP), Chrome Incognito, Brave, Firefox (Strict tracking protection), and iOS WebViews block or drop third-party cookies by default.
3. **Partial Client State:** Because `Auth.jsx` still received `result.data.user` in the response body and dispatched `setUserData(result.data.user)` to Redux, the user appeared logged in with credits visible—but `req.cookies.token` was `undefined` on all subsequent requests, causing `Backend/middleware/isAuth.js` to reject them with `"Token not found"`.
4. **Logout Cookie Mismatch:** `logout` in `googleAuth.controller.js` called `res.clearCookie('token')` without matching `{ httpOnly, secure, sameSite }` options, which prevents some production browsers from clearing cookies cleanly.

### 2.3 Solution Implemented
Implemented **dual-channel JWT authentication** (cookie + `Authorization: Bearer <token>` fallback):

| File | Change |
|---|---|
| `Backend/controllers/googleAuth.controller.js` | Normalized email (`trim().toLowerCase()`); returned `token` in the `/api/auth/googleAuth` JSON response alongside `user`; passed matching `{ httpOnly, secure, sameSite }` options to `res.clearCookie('token', ...)`. |
| `Backend/middleware/isAuth.js` | Reads `req.cookies?.token` first and falls back to `req.headers.authorization` (`Bearer <token>`). Rejects missing/`"null"`/`"undefined"`/invalid tokens with HTTP `401`. |
| `Frontend/src/utils/authToken.js` | Added safe `localStorage` helpers (`getAuthToken`, `setAuthToken`, `clearAuthToken`) and `setupAxiosAuthInterceptor(backendUrl)` to attach `Authorization: Bearer <token>` on requests to the backend and clear stale tokens on `401` expired/invalid responses. |
| `Frontend/src/App.jsx` | Initialized `setupAxiosAuthInterceptor(backendServerUrl)` at startup before `getCurrentUser()`. |
| `Frontend/src/pages/Auth.jsx` | Persisted `result.data.token` via `setAuthToken(...)` upon successful Google sign-in. |
| `Frontend/src/components/Navbar.jsx` | Ensured `clearAuthToken()` and `dispatch(setUserData(null))` always run in a `finally` block on logout. |

---

## 3. Payment Issue: `"Payment cannot be processed"`

### 3.1 Problem Statement
When some users attempted to purchase additional credits/tokens on the `/pricing` page, the payment flow failed with errors such as `"Failed to start payment process."` / `"Payment cannot be processed"`.

### 3.2 Root Cause Analysis
1. **Blocked Auth on Payment Endpoints:** Both `POST /api/payment/order` and `POST /api/payment/verify` are protected by `isAuth`. Any user affected by the blocked third-party cookie failed immediately during order creation.
2. **Missing Pre-Flight Checks in `Pricing.jsx`:**
   - Unauthenticated users clicking a plan were sent straight to `/api/payment/order` instead of being prompted to sign in.
   - `new window.Razorpay(options)` was called without checking if `window.Razorpay` had loaded (fails if ad-blockers or network issues block `checkout.js`).
3. **Unhandled Razorpay Failure & Stuck Loading State:**
   - `rzp.on('payment.failed', ...)` was not registered.
   - If `/api/payment/verify` threw an error, `setLoading(false)` was never called in `catch`, leaving the button stuck on `"Processing..."`.
4. **Backend Validation & Idempotency Gaps (`payment.controller.js`):**
   - Missing explicit validation for `req.userId`, positive numeric `amount`/`credits`, and required Razorpay verification fields.
   - Re-verifying an already `"Paid"` payment returned `{ message: "Already processed" }` without `success: true` or `user`, causing the frontend to miss updating Redux state.

### 3.3 Solution Implemented
| File | Change |
|---|---|
| `Backend/controllers/payment.controller.js` | Added `req.userId` check (`401`), numeric validation for `amount` and `credits` (`400`), verification payload presence check (`400`), structured JSON error responses with server logging, and idempotent `"Paid"` response returning `{ success: true, message: "Already processed", user }`. |
| `Frontend/src/pages/Pricing.jsx` | Added `userData` check (shows toast and opens `<AuthModel />` if signed out); added `window.Razorpay` availability check; added `prefill` (`name`, `email`); registered `rzp.on('payment.failed', ...)` handler; ensured `setLoading(false)` runs in `finally`; surfaced server error messages and prompted re-login on `401`. |

---

## 4. Verification & Testing

### 4.1 Automated Unit Tests
Created `Backend/tests/authAndPayment.test.js` covering:
- `isAuth` authenticating via `req.cookies.token`
- `isAuth` authenticating via `Authorization: Bearer <token>` when cookies are absent
- `isAuth` returning `401 "Token not found"` when neither cookie nor header is present (or when token is `"undefined"`)
- `isAuth` returning `401 "Invalid token"` on invalid JWT signatures
- `createOrder` returning `401` without `req.userId` and `400` on invalid plan amounts
- `verifyPayment` returning `400` on missing verification fields or signature mismatch

**Test Execution Result:**
```text
node --test tests/authAndPayment.test.js
# tests 10 | pass 10 | fail 0
```

### 4.2 Production Frontend Build
```text
npm run build (vite build)
✓ 1232 modules transformed.
✓ built in 23.05s (exit code 0)
```

---

## 5. Git Commit Log (`logo-update` Branch)

| Commit | Message | Scope |
|---|---|---|
| `b639486` | `logo update` | Theme-aware PNG logos, favicons, `ThemedLogo.jsx`, `Navbar.jsx`, `Auth.jsx`, `index.html` |
| `2c2fdb7` | `fix(auth): support Bearer token fallback in isAuth middleware` | `Backend/middleware/isAuth.js` |
| `51e24c4` | `fix(auth): return JWT in googleAuth response and match cookie options on logout` | `Backend/controllers/googleAuth.controller.js` |
| `009d166` | `fix(payment): add order/verify validation and idempotent Paid response` | `Backend/controllers/payment.controller.js` |
| `dc61339` | `feat(auth): add authToken utility and axios Bearer interceptor` | `Frontend/src/utils/authToken.js` |
| `114039b` | `feat(auth): initialize axios auth interceptor in App` | `Frontend/src/App.jsx` |
| `52ef49c` | `fix(auth): persist JWT token in localStorage on Google login` | `Frontend/src/pages/Auth.jsx` |
| `daf7830` | `fix(auth): clear stored JWT token on logout` | `Frontend/src/components/Navbar.jsx` |
| `2c0261a` | `fix(payment): guard auth/Razorpay availability and handle payment failures` | `Frontend/src/pages/Pricing.jsx` |
| `873c2bb` | `test(auth,payment): add unit tests for isAuth Bearer fallback and payment validation` | `Backend/tests/authAndPayment.test.js` |
