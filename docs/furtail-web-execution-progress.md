# Furtail Web Execution Progress (Ledger)

This file is the current source-of-truth work ledger. Read this before doing
anything else in a new session — do not restart from a blank "Prompt 01"
audit, and do not trust old prose-summary docs (`furtail_web_final_summary.md`,
`furtail_web_forensic_audit_report.md`) at face value; both were already
shown to overstate completeness once. Verify a sample of this ledger's own
claims against current source before trusting them too.

Last updated: 2026-08-17, mid-session checkpoint. Work continues from
"Remaining work" below in the next turn/session.

## Session summary

A fresh source-of-truth gap audit (frontend `src/app`+`src/lib`, backend
`furtail_app_api/src/routes`+`src/modules`, `prisma/schema.prisma`, git log)
was run rather than trusting stale docs. It found the app had drifted
further from "complete" than the old forensic report suggested, in one
specific, systemic way (see below), plus several narrower gaps. All of the
following were found and fixed this session, verified with
`tsc --noEmit` (both frontend and backend), `next build`, and targeted Jest
runs (not just "build passed").

### Fixed — Priority 1 (critical, app-wide)

1. **`/api/proxy/[...path]` route was completely missing.**
   `src/lib/api-client.ts`'s `fetchApi` targets it for every authenticated
   call; every domain client (posts, social, messages, notifications, pets,
   fundraising, adoption, wallet, settings) 404'd end-to-end. Added
   `src/app/api/proxy/[...path]/route.ts` — reads the httpOnly access-token
   cookie server-side, forwards method/query/body/headers to
   `${NEXT_PUBLIC_FURTAIL_API_URL}/{path}`, streams the response back.
2. **`fetchApi` never unwrapped the backend's response envelope** — the
   Furtail API always replies `{success, data, meta}` /
   `{success:false, error:{code,message,details}, meta}` (`sendSuccess`/
   `sendError` in `core/http/api-response.ts`), but `handleApiResponse`
   (`src/lib/api-error.ts`) returned the raw envelope and parsed errors from
   the wrong (non-nested) fields. Nearly every API client function in this
   codebase was written *assuming* `fetchApi` already returns the unwrapped
   payload (e.g. `messagesApi.getMessages` typed `{items}`, which is only
   true of `envelope.data`) — so this one bug silently broke most reads.
   Fixed centrally in `handleApiResponse`; every call site now gets what its
   type annotation already claimed. This required auditing and fixing every
   consumer that had grown a defensive `.data ?? .items ?? raw` hedge or
   (worse) a `foo?.data?.field` access that happened to "work" only because
   `envelope.data` and an intended `{data: [...]}` shape shared a key name
   by coincidence (Home feed) — see file list below.
3. **`/api/auth/me/route.ts`** called the nonexistent `/users/me`; fixed to
   `/auth/me` (matches `auth.routes.ts`'s JIT-provisioning handler and the
   OAuth callback's own bootstrap call).
4. **Idempotency-Key generation was implemented but commented out** in
   `fetchApi` — every `POST` (including donation checkout, which the
   backend rejects without this header) omitted it. Uncommented, now uses
   `crypto.randomUUID()`.
5. **`usersApi`/`authApi` called nonexistent paths** (`/users/:id/profile`,
   `/users/me/profile`) with a made-up flat `Profile` shape. Fixed to the
   real `/user/:userId` / `/user/me` / `/user/by-username/:username`, typed
   against the real `SharedProfilePayload` (`{id, publicId, auth, profile:
   {displayName, avatarMedia, ...}}`) returned by
   `shared-user-profile.ts`'s `toSharedProfilePayload`.
6. **Settings page double-JSON-stringified its mutation body** (`fetchApi`
   already stringifies non-FormData bodies; the page called
   `JSON.stringify` again before handing it off) *and* sent a nested
   `{profile: {...}}` shape the backend doesn't accept (flat fields only,
   and `location` isn't a real field — `placeLive` is). Rewrote to use the
   fixed `usersApi.updateProfile` with the correct flat/renamed fields.

### Fixed — Priority 2 (core social)

7. **Dead buttons wired to real mutations**: `post-card.tsx` (like,
   bookmark/save, share via Web Share API + copy-link, edit, delete with
   confirmation dialog — added `alert-dialog.tsx` via shadcn), `settings`
   page's "Change Avatar" (real `POST /media/upload` + `PATCH /user/me`
   avatarMediaId), `post-composer.tsx`'s image-attach button (real upload,
   passes `mediaIds` on create; removed the emoji/location buttons since
   they were purely decorative with no backend support — per the "remove
   dead controls for unsupported capabilities" rule rather than leaving a
   fake affordance).
8. **`RelationshipButton` read entirely wrong field names** — checked
   `status.friendStatus === 'FRIENDS'` etc., a shape that doesn't exist;
   the real `RelationshipState` (from `relationships.service.ts`) uses
   `isFriend: boolean` / `friendRequestState: 'NONE'|'OUTGOING_PENDING'|
   'INCOMING_PENDING'`. Rewrote against the real shape, and — since Furtail
   supports friendship *and* follow as independent relationships — added a
   secondary follow/unfollow toggle button (the mutations existed but were
   never called in JSX before this).
9. **`saved/page.tsx`** was 100% static hardcoded empty states. Wired the
   Posts tab to the real `GET /posts/bookmarked`. Fundraising/Adoption tabs
   left as an honest "coming soon" (no backend save/favorites-*list*
   endpoint exists for either yet — see Remaining work).
10. **`profile/[id]/page.tsx`** self-admittedly mocked: the posts tab called
    the generic feed (`// Mocking user posts`) and the pets tab called
    `getMyPets` regardless of whose profile was open
    (`// Assuming we have an endpoint for user pets`) — meaning every
    visited profile actually showed the *viewer's own* posts/pets. Fixed
    posts via the already-existing `GET /posts/user/:userId`. Pets had no
    equivalent endpoint at all, so one was added (small, bounded,
    backward-compatible per the API contract rule):
    `PetContractClient.listPetsByOwner(viewerId, ownerUserId)` implemented
    in both `PrismaPetClient` and `InMemoryPetClient` (same visibility rule
    as viewing a single pet: owner sees all, everyone else sees only
    public/active pets), routed at `GET /api/v1/users/:userId/pets`, with a
    new integration test (`pets.integration.test.ts`) covering both the
    visitor and owner cases.
11. **`/people` was linked from both nav components but the route didn't
    exist** (confirmed via `next build`'s route list) — 404 on click. Built
    `src/app/(app)/people/page.tsx`: Suggestions tab (`GET
    /social/discovery/suggestions`) and incoming-Requests tab (`GET
    /social/friend-requests/incoming`), both using the fixed
    `RelationshipButton` for actions.
12. Added `MessagesBadge`/`NotificationsBadge` unread-count dots to both
    `Sidebar` and `BottomNav` (the unread-count client functions existed
    but were called nowhere before this).

### Fixed — Priority 3/4 (realtime + notifications)

13. **SSE named-event mismatch** — the backend (`realtime-hub.ts`) always
    writes named events (`event: message.created`, etc.); the frontend
    (`use-realtime.ts`) only wired the generic `source.onmessage`, which
    per the SSE spec only fires for *unnamed* events, so it silently never
    received anything. Added `addEventListener` for every event name the
    backend emits (`message.*`, `conversation.updated`, `presence.*`,
    `notification.created`), each invalidating the correct query keys.
14. **Notifications were never published to the realtime hub at all**
    (push-notification delivery only). Added `notification.created` to
    `RealtimeEvent`'s type union and had `PrismaNotificationDispatcher`
    call `realtimeHub.publishToUser(...)` alongside its existing best-effort
    push. Threaded `realtimeHub` through `SocialRoutesDeps`/`PetRoutesDeps`
    (both already receive it at the `rootRouter(deps)` call site via the
    shared `RootRouterDeps` object — this is a type-level wiring change,
    not a new runtime dependency).
15. **Notification payload shape mismatch** — frontend read a nested
    `notif.actor`/`notif.sender` object that never existed; backend's
    `toPayload()` returns flat `actorName`/`actorAvatarUrl`. Fixed the page
    to the real shape, and added a `NotificationItem` type +
    `notificationTargetHref()` helper that builds an *internal* route from
    the notification's structured `related*` ids (never trusts/navigates
    the raw `actionUrl` string from the payload) — click-to-navigate is now
    wired (was previously mark-as-read only, no navigation at all).

### Noted, explicitly NOT fixed this session (pre-existing, unrelated)

- `tests/pets.integration.test.ts`'s "prevents duplicate follow" case
  expects a second identical follow to return 200; `InMemoryPetClient.
  followPet` (pre-existing, untouched) intentionally throws 409 on a
  duplicate. Confirmed via `git diff` this predates this session. Left
  alone to avoid unrelated scope creep in an already very large diff —
  whoever owns that test next should reconcile the assertion with the
  intentional behavior.

## Fixed — Priority 5/6/messaging (this same session, second pass)

16. **Search architecture bug found and fixed**: `searchPosts` in
    `search.service.ts` queries `prisma.post`, which is *never populated* —
    every post write goes through `SocialCoreStore.createPost` (in-memory
    only), unconditionally, regardless of whether Prisma is configured. So
    post search returned nothing for 100% of real posts, always, not just
    as a fallback edge case. Added `SocialCoreStore.searchPosts()`
    (case-insensitive caption match over `getVisiblePosts`, so it inherits
    the same privacy/block filtering as everything else) and wired it into
    `search.routes.ts` for both the `posts` and `all` search types. Added
    `tests/search.integration.test.ts` (2 tests, passing) proving a real
    created post is now actually findable.
17. **Trending was fake** — `explore/page.tsx` called the exact same
    `postsApi.getFeed()` as Home and just relabeled it "Discover popular
    posts." Implemented a real minimal ranking:
    `SocialCoreStore.listTrendingPosts(viewerId, limit)` — recency-decayed
    engagement score (`likes*2 + comments*3 + shares*4` divided by
    `(ageHours+2)^1.4`) over posts from the last 7 days only (bounded scan,
    not unbounded). Routed at `GET /api/v1/posts/trending`, added
    `postsApi.getTrending()`, wired into Explore with an honest empty state.
    Added `tests/trending.integration.test.ts` (2 tests, passing) proving a
    heavily-liked post actually outranks a quiet one — not just recency.
18. **Messaging polish**: rewrote `messages/[id]/page.tsx` —
    - Fixed a real *rendering-order bug*: the backend returns messages
      newest-first (cursor pages via `id: {lt: cursor}`), but the page
      rendered that array directly top-to-bottom with no reversal, so the
      thread displayed upside down (newest at top, oldest at the
      auto-scrolled-to bottom). Now sorted oldest-first for display.
    - Switched to `useInfiniteQuery` with a canonical-id-keyed dedup map
      (per the messaging data-integrity rule: never dedupe by text) and a
      "Load older messages" button using the real cursor.
    - Wired the previously-unused `editMessage`/`deleteMessage` client
      functions to real UI (per-message dropdown, own messages only,
      confirmation via inline edit box / immediate unsend matching backend
      soft-delete-as-tombstone semantics — deleted messages render "This
      message was removed").
    - Removed the fragile optimistic-insert-with-temp-id path (the exact
      "in-flight optimistic vs. SSE vs. reload" race the messaging
      data-integrity rule warns about) in favor of `onSuccess` invalidation
      now that SSE delivers `message.created` reliably; reduced the poll
      from every 5s to a 20s safety net alongside SSE rather than removing
      it outright (no live-browser runtime check was performed this
      session to confirm SSE reliability under real network conditions —
      keeping a slower net is the honest tradeoff until that check happens).
    - Fixed `/user/me` field access (`me?.item?.id` → `me?.id`, matching
      the real flat response shape, same class of bug as elsewhere this
      session).

Both new backend routes' owning test suites, plus the pre-existing
`social.integration.test.ts`/`social-privacy-enforcement.integration.test.ts`/
`social-relationships-api.integration.test.ts` (31 tests) were re-run after
these changes with no regressions. Frontend `tsc --noEmit` and `next build`
both clean after every step above, not just at the end.

## Fixed — Fundraising + Adoption (this same session, third pass)

19. **Fundraising**: added `/fundraising/create` (real `POST
    /fundraising/campaigns` — canonical category/beneficiaryType values
    sourced from Flutter's `fundraising_option_catalog.dart`, not invented),
    `/fundraising/my` (real `GET /fundraising/my/campaigns`), and
    `/fundraising/payment-status` (polls the server-verified `GET
    /fundraising/payments/:referenceId/status` — never reads a `status`
    query param as truth). Fixed the donate flow's response handling (was
    reading a nonexistent `res.checkoutUrl`; real shape is
    `{donationIntent, payment: {redirectUrl}, reused}`), added the required
    `consentAccepted` field, wired "Start Campaign"/"My Campaigns" nav, and
    replaced the dead Share/Save buttons on the campaign detail page (Share
    now uses the Web Share API + clipboard fallback; Save was removed —
    fundraising has no save/bookmark backend concept, so a fake button was
    deleted rather than left decorative).
    - **Known gap, deliberately not touched**: the EPS payment gateway's
      browser-return handler (`epsReturnHandler` in `fundraising.routes.ts`)
      always redirects to the hardcoded `FUNDRAISING_APP_RETURN_DEEP_LINK`
      (a `furtail://` mobile deep link) after server-side verification,
      regardless of the `returnUrl` the web client requested at checkout
      time. So `/fundraising/payment-status` is real and correct once
      reached, but a web donor's browser won't actually land there after a
      real EPS payment today — it'll hit the mobile deep link instead.
      Fixing this safely needs either storing the caller's platform/
      returnUrl on the donation record and branching the redirect, or a
      platform-aware env config; both touch the live payment-callback path
      with zero existing test coverage, so this was deliberately left alone
      this session rather than risking the working mobile flow. Flagged as
      `BLOCKED_EXTERNAL_CONFIGURATION`/needs-a-deliberate-backend-change,
      not silently left as if it worked.
20. **Adoption**: fixed the field-name mismatch causing silent data loss on
    every submitted application (frontend sent `{notes}`; backend expects
    `messageToOwner`/`applicantName`/`applicantPhone`) and added the
    missing name/phone fields to the apply dialog. Added `/adoption/create`
    (real two-call `POST /adoption/drafts` → `POST /adoption/:id/publish`
    flow, with a real cascading species→breed picker backed by `GET
    /common/animal-types`/`GET /common/breeds/:id` — canonical taxonomy,
    not a hardcoded species list) and `/adoption/my` (real `GET
    /adoption/my` listing management: pause/resume/mark-adopted via `POST
    /adoption/:id/status`, plus a per-listing applications panel reading
    `GET /me/adoptions/:id/applications` with real approve/reject via
    `POST /me/adoption-applications/:id/status`). Wired "List a Pet"/"My
    Listings" nav, fixed the campaign-card envelope-unwrap leftover
    (`petResponse.item || petResponse` → the pet object directly), replaced
    the dead Heart/Share buttons (Heart removed — no list-favorites
    endpoint exists backend-side to make it meaningful yet, same class of
    gap as fundraising's Save; Share wired to the Web Share API).
    - **Known gap, not done this pass**: adoption favorites has
      favorite/unfavorite POST/DELETE endpoints but no list-favorites
      endpoint — same pattern as the pets-by-owner gap fixed earlier this
      session, equally fixable the same way, just not yet done. The
      application state machine also has no real transition-guard on the
      backend (per the original audit) — any status can move to any
      status; the frontend's Approve/Reject buttons work today but don't
      themselves add a missing backend guard.

`next build` (28 routes, all new pages present) and frontend `tsc --noEmit`
both clean after all of the above.

## Fixed — Settings/Safety (this same session, fourth pass)

21. **Block/Report — real backend, zero frontend before this pass.** Added
    `reportsApi`/`socialApi.blockUser`/`unblockUser`/`getBlockedUsers`
    client functions, a reusable `<ReportDialog>` (real `GET
    /reports/reasons?type=` + `POST /reports`, canonical reason codes from
    the backend, not invented), wired into `post-card.tsx`'s dropdown
    (Report post, non-owners only) and a new Block/Report menu on
    `profile/[id]/page.tsx` (previously had no menu at all). Added a
    "Blocked Users" card to Settings (`GET /social/blocked` +  per-row
    Unblock).
22. **Privacy — real backend, zero frontend before this pass.** Added a
    Privacy card to Settings with four selects (profile visibility,
    who-can-follow/message/comment), each independently saved via the
    already-fixed `usersApi.updateProfile`, using the exact enum values
    `normalizeVisibility`/`normalizeInteractionSetting` accept
    (`PUBLIC`/`FOLLOWERS_ONLY`/`PRIVATE`,
    `EVERYONE`/`FOLLOWERS`/`NOBODY`) — not invented labels.

`next build` (28 routes) and frontend `tsc --noEmit` clean after all of the
above.

## Remaining work (priority order per current directive)

- [ ] **Wallet**: complete backend (`Wallet`/`WalletLedgerEntry`/
  `WalletWithdrawRequest` models + routes), zero frontend — not started.
  This is the single largest remaining gap.
- [ ] **Notification preferences** (the `GET/PATCH
  /user/me/notification-preferences` toggle set) — Settings still only has
  profile + privacy + blocked-users cards; notification-preference toggles
  were not added this pass.
- [ ] **Adoption favorites list endpoint** (small, bounded, same pattern as
  the pets-by-owner fix already done this session — see above).
- [ ] **Fundraising EPS-return platform routing** (see the flagged gap
  above — needs a deliberate decision + careful testing, not a quick patch).
- [ ] **Report/Block on additional entities**: `ReportDialog` is wired for
  posts and users only; comments/pets/fundraising/adoption listings all
  have real backend report `type`s (`COMMENT`, `PET`, `FUNDRAISING`) the
  dialog already supports by type param, just not yet triggered from those
  screens' UI.
- [ ] **Final dead-UI sweep + route-by-route runtime verification** — this
  session verified via `tsc`/`next build`/targeted backend Jest, not a live
  browser click-through of every flow; that's still owed before any "PASS"
  claim on the full 16-phase spec.

## How to resume if this session ends mid-flight

1. Re-read this file in full before touching anything.
2. Spot-check 2-3 "Fixed" claims above against current source (same
   discipline this ledger itself is applying to the previous, false
   "100% complete" claim) — e.g. confirm `src/app/api/proxy/[...path]/
   route.ts` still exists and `git log`/`git status` hasn't moved since.
3. Continue with the first unchecked item in "Remaining work", in the
   priority order given at the top of this session's directive: Search →
   Trending → Messaging polish → Fundraising → Adoption → Wallet →
   Settings/safety → final sweep.
4. Do not re-run the full ground-truth audit again unless there's concrete
   reason to believe more out-of-band work has landed since this ledger was
   written (check `git status`/file mtimes first).
