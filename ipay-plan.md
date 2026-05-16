# Implementation Plan - iPaymu Payment Integration

This plan outlines the steps to integrate iPaymu as an automated payment gateway for Skripzy, providing an alternative to the existing DOKU integration.

## User Review Required

> [!IMPORTANT]
> - iPaymu requires a **Virtual Account (VA)** and **API Key**. I have found these in `ipaymu.txt`.
> - The integration will use the **Redirect** method, where users are sent to iPaymu's secure payment page.
> - We need to ensure the **Callback/Notify URL** is correctly configured in the iPaymu Dashboard to point to our worker.

## Proposed Changes

### 1. Cloudflare Worker (`script-worker.js`)

#### [MODIFY] [script-worker.js](file:///d:/Projek/Skripzy2/script-worker.js)
- Add iPaymu configuration helper: `getIpaymuConfig(env)`.
- Implement `generateIpaymuSignature(apiKey, va, body, method)` using the logic found: `POST:{va}:{sha256(body)}:{apiKey}` and HMAC-SHA256 with `apiKey`.
- Add a helper to generate the timestamp in `YYYYMMDDHHmmss` format.
- Add `/api/ipaymu/create-payment` endpoint:
    - Verifies Firebase token.
    - Validates payload.
    - Generates iPaymu signature.
    - Calls iPaymu `https://my.ipaymu.com/api/v2/payment`.
    - Saves the transaction to the `topups` table with status `waiting_payment`.
    - Returns the `payment_url`.
- Add `/api/ipaymu/notification` endpoint (Webhook):
    - Verifies the signature from iPaymu (if provided in headers).
    - Updates the transaction status in the `topups` table based on the notification (e.g., `berhasil` -> `approved`).
    - If `approved`, update the user's `credits` or `plan` in the `users` table.

### 2. Frontend Library (`lib/billing.js`)

#### [MODIFY] [billing.js](file:///d:/Projek/Skripzy2/lib/billing.js)
- Implement `createIpaymuPayment` function, similar to `createDokuPayment`, calling the new worker endpoint.
- Update `PAYMENT_METHODS` or `MANUAL_PAYMENT_CHANNELS` if we want to show iPaymu specifically, but the user requested "automatic", so it should probably be an option under `automatic` or replace DOKU if preferred. I will add it as a new option.

### 3. Frontend UI (`apps/app-main/app/dashboard/langganan/page.js`)

#### [MODIFY] [page.js](file:///d:/Projek/Skripzy2/apps/app-main/app/dashboard/langganan/page.js)
- Add iPaymu as a selectable payment channel when `automatic` method is selected, OR add a new `ipaymu` payment method.
- Update the submission logic to call `createIpaymuPayment`.

## Verification Plan

### Automated Tests (via Browser Subagent)
- Simulate a payment request and verify the redirect URL is generated.
- *Note: Actual payment processing requires a real transaction or sandbox account testing which may be limited.*

### Manual Verification
- The user will need to test the redirect to iPaymu.
- The user will need to verify if the notification webhook correctly updates the database after a successful (simulated) payment.
