# Furtail Web API Contract Map

Current source of truth. Every route below is verified against actual
`furtail_app_api/src/routes/*.ts` source, not assumed. All requests go
through `src/lib/api-client.ts`'s `fetchApi`, which targets
`/api/proxy/{endpoint}` (same-origin Next.js proxy, see `route-map.md`) and
unwraps the backend's `{success, data, meta}` envelope automatically —
domain client functions in `src/lib/api/*.ts` should be typed against the
unwrapped `data` shape, never the raw envelope.

## Auth
- `POST {WPA_AUTH_API_URL}/oauth/token` — server-side only (callback/refresh routes)
- `GET /api/v1/auth/me` — session bootstrap (JIT-provisions the user)
- `GET/PATCH /api/v1/user/me` — current profile
- `GET /api/v1/user/:userId`, `GET /api/v1/user/by-username/:username` — visitor profile

## Social / Posts
- `GET /api/v1/posts/feed`, `GET /api/v1/posts/trending`, `GET /api/v1/posts/user/:userId`, `GET /api/v1/posts/bookmarked`
- `POST/PATCH/DELETE /api/v1/posts`, `/api/v1/posts/:postId`
- `POST/DELETE /api/v1/posts/:postId/like`, `/bookmark`; `POST /api/v1/posts/:postId/share`
- `GET/POST /api/v1/posts/:postId/comments`; `PATCH/DELETE /api/v1/posts/:postId/comments/:commentId`; `POST/DELETE .../like`; `POST .../replies`
- `GET /api/v1/search?type=people|posts|pets|all` (post search is store-backed, not Prisma-backed — see execution-progress.md)
- `GET /api/v1/posts/videos` — real, auth-required, dedicated VIDEO/REEL-typed feed (`listVideosFeed` in social-store.ts). Supports `page`/`limit`/`search`/`category`/`sort`/`duration`/`followingOnly`. Was missing from this doc; had zero frontend client until `postsApi.getVideosFeed` (this session) — the data source for a Reels rail, no separate "reel" entity exists beyond `PostType.REEL`/`VIDEO`.
- `GET /api/v1/posts/user/:userId/videos` — per-user video gallery, same undocumented/unconsumed status as above.

## Stories (24h ephemeral media — Postgres-backed `Story`/`StoryView` tables)
- `GET /api/v1/stories/feed` — flat, most-recent-first list of unexpired stories (self + non-blocked users); optional auth
- `POST /api/v1/stories` — multipart `media` file + optional `caption`
- `POST /api/v1/stories/:id/view` — marks viewed by the caller
- `DELETE /api/v1/stories/:id` — owner-only
- Was entirely undocumented and had zero frontend client before this session (`src/lib/api/stories.ts` added, see `tests/stories-api.integration.test.ts` on the backend for the regression coverage that proves this is real, not in-memory-only).

## Social graph
- `GET /api/v1/social/status/:userId`, `GET /api/v1/social/counts/:userId`
- `POST/DELETE /api/v1/social/follow/:userId`
- `POST /api/v1/social/friend-request/:userId`; `POST .../accept`, `.../reject`; `DELETE .../cancel`; `DELETE /api/v1/social/friends/:userId`
- `GET /api/v1/social/friends`, `/followers`, `/following`, `/friend-requests/incoming`, `/friend-requests/outgoing`
- `GET /api/v1/social/discovery/suggestions`
- `GET /api/v1/social/blocked`; `POST/DELETE /api/v1/social/block/:userId`

## Reports
- `GET /api/v1/reports/reasons?type=USER|POST|COMMENT|PET|FUNDRAISING`
- `POST /api/v1/reports`

## Messaging
- `GET/POST /api/v1/messages/conversations`; `GET/POST /api/v1/messages/conversations/:id/messages`
- `PATCH/DELETE /api/v1/messages/conversations/:id/messages/:messageId`
- `POST /api/v1/messages/conversations/:id/read`; `GET /api/v1/messages/unread`
- `GET /api/v1/realtime/stream` (SSE — `message.created/updated/deleted/read`, `conversation.updated`, `presence.online/offline`, `notification.created`)

## Notifications
- `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`

## Pets
- `GET/POST /api/v1/me/pets`, `GET/PATCH/DELETE /api/v1/me/pets/:petId`
- `GET /api/v1/pets/:petId`, `GET /api/v1/pets/slug/:slug`
- `GET /api/v1/users/:userId/pets` — added this session (was missing; visited profiles previously showed the viewer's own pets)
- `POST/DELETE /api/v1/pets/:petId/follow`, `/like`; `GET .../social-status`; `GET/POST .../posts`
- `GET /api/v1/common/animal-types`, `GET /api/v1/common/breeds/:typeId` — taxonomy, used by pet + adoption creation forms

## Fundraising
- `GET /api/v1/fundraising/feed`, `/my/campaigns`, `/campaigns/:id`
- `POST /api/v1/fundraising/campaigns` (create+submit in one call — no separate draft step for basic creation)
- `PATCH /api/v1/fundraising/campaigns/:id`; `POST .../publish`; `DELETE /api/v1/fundraising/campaigns/:id`
- `POST /api/v1/fundraising/campaigns/:id/donate` (requires `Idempotency-Key`)
- `GET /api/v1/fundraising/payments/:referenceId/status` — the only trusted source of payment outcome, never a browser redirect param
- `GET /api/v1/fundraising/payments/eps/success|fail|cancel` — EPS-only callback, not called by the web client directly (see execution-progress.md's flagged gap)

## Adoption
- `GET /api/v1/adoption/feed`, `/my`, `/:id`
- `POST /api/v1/adoption/drafts`; `PATCH /api/v1/adoption/:id/draft`; `POST /api/v1/adoption/:id/publish`
- `POST/DELETE /api/v1/adoption/:id/favorite` (no list-favorites endpoint yet)
- `POST /api/v1/adoption/:id/apply` (body: `applicantName`, `applicantPhone`, `messageToOwner`, not `notes`)
- `POST/PATCH /api/v1/adoption/:id/status`
- `GET /api/v1/me/adoption-applications`, `GET /api/v1/me/adoptions/:id/applications`
- `POST /api/v1/me/adoption-applications/:id/status`

## Wallet (backend exists, no frontend client yet)
- `GET /api/v1/wallet/me`, `GET /api/v1/wallet/transactions`, withdraw-request CRUD

## Media
- `POST /api/v1/media/upload` (multipart `file`, form fields `purpose`/`contentType`/`contentId`)
- `GET /api/v1/media/*` (public/optional-auth serving)
