# Realtime SSE Proxy Architecture Verification

## Root Cause
The `[Realtime] Connection error, reconnecting...` failure in `use-realtime.ts` was caused by the Next.js `middleware.ts` intercepting the cross-origin proxy request (`/api/proxy/realtime/stream`). Next.js Middleware running on the Edge runtime buffers `NextResponse.rewrite` requests and frequently terminates long-lived streaming connections (Server-Sent Events) prematurely. This led to immediate or fast transport closure, triggering the naive hardcoded 5-second `EventSource` reconnect loop in `use-realtime.ts`.

## New Architecture

### 1. Same-Origin Node.js Proxy Route
To securely bypass the Edge Middleware buffering and properly pipe the stream chunk-by-chunk, a new dedicated Next.js App Router route was created at `src/app/api/realtime/stream/route.ts`. 

- **Runtime:** Node.js (via `export const dynamic = 'force-dynamic'`)
- **Authentication:** Securely reads `furtail_access_token` from HTTP-only Next.js cookies and attaches it as an `Authorization: Bearer <token>` header upstream.
- **Streaming:** Returns the `fetch` readable stream body natively, preserving `text/event-stream` and `keep-alive` headers intact.

### 2. Robust Client Reconnection (use-realtime.ts)
The hook was rewritten to implement a capped exponential backoff with jitter instead of a hardcoded 5-second infinite spam loop.
- **Backoff:** Starts at 1s, scales to 30s max, plus random jitter.
- **Duplicate Prevention:** Strict `EventSource.OPEN` state tracking and `useEffect` mount cancellation ensures only one connection runs simultaneously.
- **Logging:** Mutes the aggressive `console.error` spam during background reconnections.

## Verification Checklist
- [x] **Backend Stream Validated:** `GET /api/v1/realtime/stream` emits valid SSE frames with `text/event-stream`.
- [x] **Auth Token Security:** Access token remains hidden from browser JavaScript (secure same-origin proxy design).
- [x] **Ping/Heartbeat:** Hook filters out empty lines and `ping` events safely.
- [x] **Invalidation Mapping:** Realtime messaging and notifications trigger TanStack `queryClient.invalidateQueries` securely on specific keys.
- [x] **Tests & Build:** `npm run build` completes successfully with no TypeScript errors (Code 0).

**Status:** COMPLETE
