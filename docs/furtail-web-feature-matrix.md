# Furtail Web Feature Matrix

Current source of truth. See `furtail-web-execution-progress.md` for the
detailed session-by-session change log this matrix summarizes.

Status legend: **COMPLETE** (real UI → real API → real backend behavior,
verified) · **PARTIAL** (works but has a known gap) · **INCOMPLETE** (no
frontend despite backend support) · **NOT_APPLICABLE** (no backend concept)
· **BLOCKED_EXTERNAL** (needs a deliberate infra/config decision).

| Feature | Status | Notes |
|---|---|---|
| **Auth: login/callback/session/refresh/logout** | COMPLETE | httpOnly cookies, real PKCE, JIT-provisioning bootstrap |
| **Auth: registration** | INCOMPLETE | Form UI exists, submit handler is a stub — not fixed this session |
| **Home feed** | COMPLETE | Real posts via `/api/proxy` (was 404ing before this session) |
| **Post create (text + media)** | COMPLETE | Real image upload wired |
| **Post like/bookmark/share/edit/delete** | COMPLETE | All were dead buttons before this session |
| **Comments/replies/comment-likes** | COMPLETE | Was already correct pre-session |
| **Search (people/posts/pets)** | COMPLETE | Post search was 100%-broken (queried an always-empty table) — fixed |
| **Trending (Explore)** | COMPLETE | Was a mislabeled plain-recency feed — now a real bounded engagement ranking |
| **Friend requests (send/accept/reject/cancel/unfriend)** | COMPLETE | |
| **Follow/unfollow** | COMPLETE | Mutations existed but were never called in JSX — fixed |
| **People discovery / Suggested For You** | COMPLETE | |
| **`/people` hub page** | COMPLETE | Route didn't exist before this session despite nav links to it |
| **Messaging: send/receive/list** | COMPLETE | |
| **Messaging: realtime (SSE)** | COMPLETE | Named-event listener mismatch fixed — was silently never receiving push events |
| **Messaging: pagination, edit/delete** | COMPLETE | Was backend-complete, frontend-absent — fixed |
| **Messaging: read receipts, typing indicators** | INCOMPLETE | Not addressed this session |
| **Notifications: list/unread/mark-read** | COMPLETE | |
| **Notifications: payload mapping, deep links** | COMPLETE | Was reading nonexistent nested fields — fixed |
| **Notifications: realtime (SSE)** | COMPLETE | Backend never published to the realtime hub at all — added |
| **Pets: CRUD, public profile, follow/like** | COMPLETE | Pre-existing, verified working |
| **Pets: viewing another user's pets on their profile** | COMPLETE | Was showing the *viewer's own* pets regardless of whose profile — new backend endpoint added |
| **Pets: medical/vaccination authorization** | COMPLETE | Verified server-side-gated, not just UI-hidden |
| **Fundraising: discovery/detail** | COMPLETE | |
| **Fundraising: create/manage campaigns** | COMPLETE | No frontend existed before this session |
| **Fundraising: donate flow** | COMPLETE | Response-shape bug fixed, idempotency-key bug fixed |
| **Fundraising: payment status verification** | COMPLETE | Server-verified polling page added |
| **Fundraising: EPS browser-return routing to web** | BLOCKED_EXTERNAL | Backend always redirects to a mobile deep link regardless of platform — flagged, not touched (live payment path, zero test coverage) |
| **Fundraising: KYC/account setup** | INCOMPLETE | Not gating campaign creation (by design — see `fundraising-policy.ts`), but no account/payout-setup UI built |
| **Adoption: discovery/detail** | COMPLETE | |
| **Adoption: create/manage listings** | COMPLETE | No frontend existed before this session |
| **Adoption: applications (submit/approve/reject)** | COMPLETE | Field-name mismatch causing silent data loss fixed |
| **Adoption: favorites** | INCOMPLETE | Favorite/unfavorite work; no list-favorites endpoint exists yet |
| **Wallet** | INCOMPLETE | Complete backend, zero frontend — not started |
| **Settings: profile edit, avatar** | COMPLETE | Was double-JSON-stringifying and using wrong field names — fixed |
| **Settings: privacy toggles** | COMPLETE | Backend-complete, zero frontend before this session |
| **Settings: notification preferences** | INCOMPLETE | Not addressed this session |
| **Block/unblock** | COMPLETE | Backend-complete, zero frontend before this session |
| **Report (post, user)** | COMPLETE | Backend-complete, zero frontend before this session |
| **Report (comment, pet, fundraising, adoption)** | INCOMPLETE | `ReportDialog` supports these `type`s already; not yet triggered from those screens |
| **Groups / Communities / Events** | NOT_APPLICABLE | Confirmed via `schema.prisma` — no backend tables |
| **Voice/video calling** | NOT_APPLICABLE | No WebRTC signaling backend |
| **Message reactions, group chat** | NOT_APPLICABLE | Backend `Conversation` model is explicitly 1:1-only |
| **Stories (24h ephemeral media)** | COMPLETE | Real Postgres-backed backend (`Story`/`StoryView` models, `/api/v1/stories/*`, `tests/stories-api.integration.test.ts`). Home tray + full-screen viewer built Phase 2 (`StoryTray`, `StoryViewerModal`) — view, create (image/video), delete, 24h expiry, per-author grouping |
| **Reels / video feed** | COMPLETE | Real dedicated endpoint `GET /api/v1/posts/videos` (`listVideosFeed`). Home rail built Phase 2 (`ReelsRail`) — no distinct "reel" entity, it's `PostType.REEL`/`VIDEO` posts filtered server-side, opened in the same post detail modal as any post |
| **Mixed Home feed (posts + adoption + fundraising, client-interleaved)** | COMPLETE | Built Phase 2 (`buildMixedFeed`) — cadence-based client insert of real `/adoption/feed` and `/fundraising/feed` items into the real posts feed. Adoption listings have no `createdAt` in their payload at all (confirmed in `adoption-store.ts`'s `serializeListing`), so true chronological interleaving isn't possible; documented as a deliberate limitation in `build-feed.ts`'s comment, not silently faked |
| **People You May Know (horizontal rail)** | COMPLETE | Built Phase 2 (`PeopleYouMayKnowRail`), sharing `useSuggestions()`/`RelationshipButton` with `RightSidebar` — same real `/social/discovery/suggestions` data (now also surfacing the real `mutualFriendsCount`/`mutualFollowsCount` fields the discovery service returns, previously discarded by `normalizeAuthor`) |
| **1-2 comment previews on feed cards** | COMPLETE | Built Phase 2 (`CommentPreview`) — real first-2-comments slice of `GET /posts/:id/comments`, not a fabricated summary |
| **Post detail modal** | PARTIAL | Built Phase 2 as a client-state `Dialog` (`PostDetailModal`), not a Next.js intercepting route — `/post/[id]` remains the separate full-page fallback/shareable URL, they don't share a URL yet |
| **`/adoption` and `/fundraising` standalone pages' amount/name fields** | BUG, not fixed this session | Both pages read backend fields that don't exist (`campaign.raisedMinor`/`goalMinor`/`coverMedia`, `pet.name`/`approximateAge`/`animalBreed`/`formattedAddress`) — the real fields are `stats.raisedAmount`/`targetAmountMinor`/`media[]` and `petName`/`ageLabel`/`breed`/`location` respectively (see `adoption-store.ts`'s `serializeListing`, `fundraising-store.ts`'s `campaignPayload`). The new Home feed cards (`AdoptionFeedCard`, `FundraisingFeedCard`) use the correct real fields and render properly; the standalone list pages still silently show blank/zero amounts and "Unnamed pet" — flagged for a follow-up fix, out of this task's scope |
| **Post reactions (multi-emoji)** | NOT_APPLICABLE | `PostLike` is a single binary like (unique per user+post, no reaction-type column) — no love/haha/wow etc. in the schema. Any multi-reaction picker in Phase 2 would be decorative unless scoped down to like-only |
| **Mixed home feed (social + adoption + fundraising in one list)** | NOT_APPLICABLE | No unified feed endpoint; `AdoptionListing`/`FundraisingCampaign` are separate Prisma models from `Post` with their own `/adoption/feed` and `/fundraising/feed` endpoints. A "mixed feed" is a client-side merge-and-interleave of 3 real feeds, not one real feed — must not be presented as a single backend-native feed |
