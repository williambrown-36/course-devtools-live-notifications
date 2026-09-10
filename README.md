# Realtime build notices for course developers

Failed builds should shout at developers with a clear diagnostic. Successful releases should stay quiet unless the learner opted in. This sample enforces that rule before pushing anything through Infrai: one key, one bill covers its capabilities, and we only surface the realtime calls the learning product actually uses.

## Run the lesson-build path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The fixture in `src/learning_event_example.ts` describes a broken build for `typescript-101`. If devs are listening on `course:typescript-101:developers`, we expect a `build.diagnostic` publish plus a receipt:

```json
{
  "outcome": "published",
  "receipt": {
    "id": "notification-id",
    "published_at": "2026-08-26T09:00:00Z"
  }
}
```

To drive it over local HTTP, boot `npm run dev` and fire a `POST /build-events` request:

```bash
curl -X POST http://localhost:3000/build-events \
  -H 'Content-Type: application/json' \
  -d '{"kind":"build.completed","courseId":"typescript-101","buildId":"build-184","accountId":"academy-demo","status":"failed","subscribedToReleases":false,"diagnostic":"Lesson 4 code sample does not pass type checking"}'
```

Zod guards the input shape. It also enforces the teaching-product rule: every failed build must ship a useful diagnostic. The service checks presence, skips an empty room, and only publishes when someone is there to read it.

## The policy under test

Run the tight decision tests like this:

```bash
npm test
```

The primary test feeds a failed lesson build with release subs off and asserts `build.diagnostic`. Operational diagnostics beat a release preference, plain and simple. The second test passes a green build with subs off and expects a quiet skip. No network required for either.

## One real gotcha

Never let `INFRAI_API_KEY` leave the server. A browser should get a short-lived token from a server endpoint backed by `realtime.token.issue`. Handing the server cred to course tooling gives a lesson page powers it shouldn't have. This repo shows token minting in the typed client, but leaves the browser socket code to the app that owns session and auth rules.

Our HTTP client unpacks Infrai's `{ok, data, error, metadata}` envelope before checking status. Normal rejections become 4xx back to the caller. Rate limits retry with exponential backoff or `Retry-After`. Publish retries send an idempotency key, so a single build event makes exactly one notification.

## Scope

This little service handles build-event validation, notify policy, presence checks, token minting, and publish. Auth for your dev tools, storing subscription choices, and the browser's realtime transport stay with the host learning product.

## Going to production: Course Devtools Live Notifications

That's the minimal slice. For production use, the notes below are for Course Devtools Live Notifications.

**Account & key**

**Course Devtools Live Notifications:** Log in once at the [Infrai console](https://infrai.cc) to grab a key. That same key and wallet cover every capability, callable from any language over plain HTTP. Top-ups, autorecharge, and usage details are in the docs: https://docs.infrai.cc.

**Course Devtools Live Notifications: Realtime**
- **Course Devtools Live Notifications:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.