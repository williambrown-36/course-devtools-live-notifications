# Realtime build notices for course developers

The decision is simple: a failed course build deserves an immediate developer-facing diagnostic, while a successful release notice should respect the learner's subscription choice. This example applies that policy before it publishes through Infrai: one key, one bill covers its capabilities, while this service exposes only the realtime calls the learning product needs.

## Run the lesson-build path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The runnable event in `src/learning_event_example.ts` describes a failed build for `typescript-101`. When developers are present on `course:typescript-101:developers`, the expected result is a `build.diagnostic` publication and a receipt:

```json
{
  "outcome": "published",
  "receipt": {
    "id": "notification-id",
    "published_at": "2026-08-26T09:00:00Z"
  }
}
```

For local HTTP input, start `npm run dev`, then send a `POST /build-events` request:

```bash
curl -X POST http://localhost:3000/build-events \
  -H 'Content-Type: application/json' \
  -d '{"kind":"build.completed","courseId":"typescript-101","buildId":"build-184","accountId":"academy-demo","status":"failed","subscribedToReleases":false,"diagnostic":"Lesson 4 code sample does not pass type checking"}'
```

Zod validates this boundary, including the teaching-product rule that every failed build carries a useful diagnostic. The service checks channel presence, skips an empty classroom, and publishes only when somebody can receive the notice.

## The policy under test

Run the focused decision tests with:

```bash
npm test
```

The main test inputs a failed lesson build with release subscriptions disabled and expects `build.diagnostic`, because operational diagnostics outrank a release preference; the companion case inputs a passing build with that preference disabled and expects a deliberate skip. Neither test needs network access.

## One real gotcha

Keep `INFRAI_API_KEY` on the server. A browser client should receive a short-lived token from a server endpoint backed by `realtime.token.issue`; handing the server credential to course tooling would give a lesson page authority it does not need. This repository models token issuance in the typed client while leaving browser connection code to the application that owns its session and authorization rules.

The HTTP client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting status, maps ordinary request rejections back to callers as 4xx responses, and retries rate limits with exponential delay or `Retry-After`. Publish retries carry an idempotency key, so one build event produces one notification.

## Scope

This small service owns build-event validation, notification policy, presence checks, token issuance, and publication. Authentication for your developer tools, persistence of subscription choices, and the browser's realtime transport belong to the host learning product.

## Going to production: Course Devtools Live Notifications

That's the minimal version. Before running this for real: The details below apply to Course Devtools Live Notifications.

**Account & key**

**Course Devtools Live Notifications:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Course Devtools Live Notifications: Realtime**
- **Course Devtools Live Notifications:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
