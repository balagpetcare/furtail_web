# Furtail Web Route Map

Current source of truth — reflects the actual `src/app` tree as of this
session (verified via `next build`'s route listing, not aspirational).
28 routes total.

## Public / Auth
| Route | Notes |
|---|---|
| `/welcome` | Public landing |
| `/login`, `/register` | Central Auth-backed; registration form is still a stub (see feature matrix) |
| `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/me` | Next.js route handlers, server-side OIDC/PKCE + cookie session |
| `/api/proxy/[...path]` | Same-origin authenticated proxy to the Furtail API — every domain client depends on this |
| `/api/realtime/stream` | SSE proxy to the Furtail API's realtime hub |

## Core social
| Route | Notes |
|---|---|
| `/` | Home feed |
| `/explore` | Real trending (recency-decayed engagement), not plain recency |
| `/search` | Multi-entity search (people/posts/pets), post search store-backed |
| `/post/[id]` | Single post + comments |
| `/saved` | Saved posts (real); fundraising/adoption saved tabs are honest "coming soon" placeholders |
| `/people` | Suggestions + incoming friend requests |
| `/profile`, `/profile/[id]` | Own/visitor profile, posts/pets/about/connections tabs, Block/Report menu |
| `/notifications` | Real payload, deep-link navigation, SSE-live |
| `/messages`, `/messages/[id]` | Conversation list + thread (SSE-live, pagination, edit/delete) |
| `/settings` | Profile edit, avatar upload, Privacy card, Blocked Users |

## Pets
| Route | Notes |
|---|---|
| `/pet/new`, `/pet/[id]`, `/pet/[id]/edit` | Full CRUD, real backend |

## Fundraising
| Route | Notes |
|---|---|
| `/fundraising` | Discovery feed |
| `/fundraising/[id]` | Detail + real donate flow |
| `/fundraising/create` | Real campaign creation (canonical category/beneficiary values) |
| `/fundraising/my` | Owner's campaigns |
| `/fundraising/payment-status` | Server-verified payment status polling — see execution-progress.md for the known EPS-redirect gap |

## Adoption
| Route | Notes |
|---|---|
| `/adoption` | Discovery feed |
| `/adoption/[id]` | Detail + real apply flow |
| `/adoption/create` | Real listing creation (draft → publish, real taxonomy picker) |
| `/adoption/my` | Owner's listings + per-listing applications (approve/reject) |

## Not present (see feature matrix for why)
`/wallet` (no frontend yet — backend complete), `/groups`, `/events`,
`/donation` standalone flow (folded into fundraising), voice/video call
routes (no backend signaling).
