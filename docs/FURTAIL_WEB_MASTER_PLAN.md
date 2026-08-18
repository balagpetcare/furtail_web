# GLOBAL INSTRUCTION — প্রথমে একবার দিন

We are building the complete production-quality web version of the Furtail social platform.

PRIMARY TARGET:
D:\wpa\furtail\furtail_web

EXISTING SYSTEMS THAT MUST BE REUSED:

* Furtail Flutter application:
  D:\wpa\furtail\furtail_app
* Furtail API:
  D:\wpa\furtail\furtail_app_api
* WPA Central Authentication system:
  Discover the actual Central Auth repositories/configuration under D:\wpa and inspect the existing implementation before integrating.
* Existing Furtail database, Prisma schema, APIs, media architecture, social architecture, fundraising architecture, adoption architecture, pet registry and authentication contracts must be treated as canonical unless a genuine missing web requirement is discovered.

DESIGN REFERENCES:
Inside:
D:\wpa\furtail\furtail_web

Locate and inspect all files matching:
Design*.png
and any Design 1 / Design 2 / Design 3 image files or design-reference subfolders.

These images are visual references for the Furtail web social-media UI.

Also inspect the existing Furtail Flutter application for:

* logo
* colors
* typography
* icons
* social terminology
* profile presentation
* fundraising UI
* adoption UI
* pet profile UI
* existing branding

IMPORTANT:
The brand is FURTAIL.
Do not accidentally use “Fertile” or another brand name from reference imagery.

GENERAL EXECUTION RULES:

1. Do not invent backend routes, request fields, enum values, database columns or authentication behavior.

2. Before implementing any feature, inspect the actual Furtail API route/controller/service/schema/model implementation and use the canonical contract.

3. Inspect the Flutter client where useful to understand existing API contracts and behavior.

4. If a required web feature genuinely has no backend API:

   * document the gap,
   * implement the smallest production-quality backward-compatible API addition,
   * add validation and authorization,
   * update API tests,
   * do not break Flutter/mobile contracts.

5. Do not create a second user database or duplicate authentication system.

6. WPA Central Auth is the identity source. Furtail API remains the Furtail application/data authorization layer.

7. Never hardcode:

   * production domains
   * JWT secrets
   * OAuth secrets
   * API tokens
   * user IDs
   * media hosts
   * localhost-only assumptions

Use typed environment configuration and create/update `.env.example`.

8. Preserve all design reference images. Never delete them.

9. If `furtail_web` is not yet a Next.js project, scaffold a production-quality Next.js App Router application in that folder while preserving the existing design assets.

If create-next-app cannot scaffold into a non-empty directory because the design images already exist, scaffold safely in a temporary directory and merge the generated project into `furtail_web`. Never delete the reference images.

10. Use:

* Next.js App Router
* TypeScript strict mode
* React
* Tailwind CSS
* accessible component primitives
* TanStack Query where it provides meaningful client cache/server-state management
* Zod for runtime validation where appropriate
* React Hook Form for substantial forms where useful

Do not add unnecessary frameworks or duplicate state-management libraries.

11. Prefer Server Components for static/server-rendered content and Client Components only where interaction requires them.

12. Build reusable primitives instead of copying page-specific UI.

13. The interface must look like a premium modern social network, not an admin dashboard.

Visual goals:

* polished Furtail brand identity
* professional desktop social layout
* responsive tablet/mobile web
* light/dark compatible architecture
* generous whitespace
* consistent rounded cards
* subtle borders and shadows
* strong avatar/pet imagery
* excellent typography
* elegant purple/violet Furtail accent system
* professional hover/focus/pressed states
* skeleton loading states
* empty states
* error states
* accessible contrast

14. Desktop application shell should support an architecture similar to:

* left navigation/sidebar
* central primary content/feed
* contextual right sidebar
* sticky/global top search where appropriate

Do not literally clone Facebook, Instagram or X. Build a unique Furtail-branded interface using familiar social-network UX principles.

15. Every user-facing feature must have:

* loading state
* empty state
* error state
* retry where applicable
* responsive state
* accessibility labels
* keyboard support where relevant

16. Use real Furtail data. Do not leave fake production content or permanent mock APIs.

17. Seed/demo fixtures may only exist in development/test infrastructure and must be clearly separated from production data.

18. Authentication-required routes must be protected correctly on both UI and API boundaries.

19. Do not trust authorization performed only by the frontend.

20. Avoid exposing raw internal IDs where a username/slug/public identifier already exists.

21. However, API identity must always use the canonical backend identifier.

22. All mutations must provide clear:

* pending
* success
* validation error
* server error
  states.

23. Responsive breakpoints must include:

* desktop
* laptop
* tablet
* narrow mobile

24. Add no horizontal overflow at normal viewport sizes.

25. Do not automatically modify unrelated BPA/WPA/Furtail modules.

26. Do not automatically launch an Android emulator. This task is the web application.

27. You may run safe web/static verification such as:

* lint
* TypeScript checks
* unit tests
* integration tests
* Playwright/browser tests if configured
* Next.js production build

28. At the end of EVERY phase report:
    A. files added
    B. files changed
    C. API routes used
    D. backend routes added, if any
    E. tests/checks executed
    F. pass/fail result
    G. remaining issues that belong to later phases

Do not ask me for confirmation between normal implementation steps.
Perform the work.

---

# PROMPT 01 — Repository Audit + Next.js Foundation

Start implementation of the Furtail web application.

TARGET:
D:\wpa\furtail\furtail_web

First perform a deep audit of:

D:\wpa\furtail\furtail_app_api
D:\wpa\furtail\furtail_app
D:\wpa\furtail\furtail_web

Also discover the existing WPA Central Authentication repositories/configuration beneath D:\wpa.

Inspect actual source code, not README assumptions.

Build a feature/API inventory covering at minimum:

AUTHENTICATION

* sign in
* registration
* email/phone verification
* refresh/session
* logout
* Central Auth callback/bridge
* social OAuth
* password reset
* session/profile bootstrap

SOCIAL

* current user
* profiles
* people discovery
* friend requests
* friendships
* followers/following if present
* posts
* media posts
* reactions/likes
* comments/replies
* sharing/reposting if supported
* saved posts
* feed
* search
* trending
* notifications
* blocks/reports

MESSAGING

* conversations
* direct messages
* group conversations if present
* unread counts
* attachments
* reactions
* typing
* read receipts
* presence
* realtime transport

PETS

* pet registry
* pet profiles
* pet posts
* vaccinations
* medical/history features exposed publicly or privately
* follow/like relationships involving pets

FUNDRAISING

* campaigns
* account setup
* verification documents
* campaign creation/editing
* contributions
* payment state
* campaign ownership
* sharing
* reports/statuses

ADOPTION

* adoption listings
* detail
* create/edit
* applications/inquiries
* favorites
* owner/adopter workflows

DONATION

* donation capabilities separate from fundraising, if present
* payment flow
* receipts/history

OTHER EXISTING MODULES

* groups/communities
* events
* moderation
* media upload
* location
* settings
* privacy
* anything else already implemented in Furtail API/mobile.

Create:
docs/furtail-web-feature-matrix.md
docs/furtail-web-api-contract-map.md
docs/furtail-web-route-map.md

Each document must identify:

* IMPLEMENTED API
* PARTIALLY IMPLEMENTED API
* MISSING API
* Flutter-only UI
* web implementation required

Then scaffold or normalize the Next.js application inside furtail_web.

Required foundation:

* App Router
* strict TypeScript
* src/ structure
* Tailwind
* ESLint
* route groups
* environment validation
* global providers
* QueryClient integration if appropriate
* application error boundary strategy
* loading states
* not-found page
* reusable API error normalization
* typed utility layer
* testing foundation

Suggested route groups:
src/app/(public)
src/app/(auth)
src/app/(app)

Do not implement fake features merely to fill pages.

Preserve Design*.png.

Create a clean project foundation and run:

* lint
* typecheck
* production build

Fix all errors before completing this phase.

---

# PROMPT 02 — Furtail Design System + Responsive Application Shell

Continue the existing Furtail web implementation.

Now build the complete Furtail visual design system based on:

1. Design*.png reference images in:
   D:\wpa\furtail\furtail_web

2. existing Furtail Flutter application branding/assets.

Do not copy incorrect “Fertile” branding from design references.

Create a professional Furtail web design system.

Implement reusable primitives for:

* buttons
* icon buttons
* inputs
* search input
* textarea
* select
* combobox
* dropdown menu
* tabs
* badges
* cards
* dialogs
* drawers
* bottom sheets
* popovers
* tooltip
* toast
* avatar
* avatar group
* pet avatar
* media container
* skeleton
* empty state
* error state
* confirmation dialog
* pagination/infinite-load sentinel
* responsive modal
* attachment picker
* reaction picker
* user/pet preview cards

Build the authenticated application shell.

DESKTOP:

* left Furtail navigation
* center workspace
* contextual right rail
* top/global search area where appropriate
* sticky navigation behavior
* notification/message badges

TABLET:

* compact navigation
* responsive center content
* optional right rail collapse

MOBILE WEB:

* top Furtail header
* bottom navigation
* mobile drawers/sheets
* full-width feed/cards where appropriate

Primary nav should be driven by real implemented modules and should include appropriate items such as:

* Home
* Explore
* People
* Friends
* Messages
* Notifications
* Fundraising
* Adoption
* Pets
* Saved
* Profile
* Settings

Only show Groups/Events/Donations/etc. if the platform actually supports or will support them through the audited implementation plan.

Create responsive layout components rather than repeating layout per page.

Add:

* accessible focus states
* keyboard navigation
* reduced motion support
* responsive typography
* consistent spacing tokens
* semantic Furtail color tokens

Do not hardcode random purple values across individual components.

If the Flutter brand provides canonical colors, derive web tokens from those.

Create a polished public landing shell as well, but detailed landing page content will be completed later.

Run lint/typecheck/build and fix all failures.

---

# PROMPT 03 — WPA Central Auth + Secure Furtail Web Session

Implement the complete production-ready authentication integration for Furtail Web.

Do NOT create local standalone Furtail username/password authentication if WPA Central Authentication is already canonical.

Inspect the live code contracts for:

* WPA Central Auth
* Furtail API auth middleware
* Flutter Central Auth integration if present
* OIDC/PKCE/client registration details
* callback contracts
* refresh/session behavior

Determine the correct existing authentication architecture and reproduce it correctly for a confidential/public web client as appropriate.

Implement:

PUBLIC/AUTH ROUTES

* landing page auth CTA
* sign in
* sign up
* forgot password
* email/phone verification where the Central Auth workflow requires it
* callback handling
* auth error screen

SOCIAL LOGIN:
Use the providers enabled by Central Auth.
Do not implement provider-specific OAuth directly inside Furtail Web if Central Auth owns provider authentication.

SESSION:

* secure server-side/session architecture
* httpOnly cookies when compatible with canonical architecture
* secure/SameSite behavior
* CSRF protections where needed
* refresh/expiry handling
* logout
* current-user bootstrap
* session recovery
* authenticated route guards
* unauthenticated redirects
* safe returnTo validation

Do not store sensitive long-lived authentication credentials in localStorage unless the canonical security architecture explicitly requires it.

Add typed configuration through environment variables.

Create/update:
.env.example

Never commit secrets.

Add auth-related API/BFF routes only when required by the real architecture.

Ensure:

* no open redirect
* no arbitrary callback URL
* no token leakage into browser URLs/logs
* authentication errors are human-readable
* a valid session is not destroyed because one optional API widget returns 401 unless the actual session is confirmed invalid

Add tests for important auth utility behavior.

Run lint/typecheck/tests/build.

---

# PROMPT 04 — Typed Furtail API Client + Media Layer

Build the shared Furtail Web data-access architecture before adding more pages.

Using the API contract map and real Furtail API source, implement a typed API layer for all currently needed domains.

Do not manually scatter raw fetch calls throughout UI components.

Create appropriate domain modules such as:

* auth
* users
* profiles
* social/feed
* posts
* comments
* reactions
* friends/connections
* messaging
* notifications
* search
* pets
* fundraising
* adoption
* donation
* media
* settings
* moderation

Implement:

* base API configuration
* auth/session integration
* query parameter encoding
* cursor pagination
* standardized error parsing
* abort support
* request IDs if backend provides them
* mutation helpers
* idempotency header support for payment-sensitive/create operations where backend expects it
* Zod parsing for risky external contracts where appropriate
* domain TypeScript types

MEDIA:
Inspect the existing canonical media/public URL architecture.

Do not hardcode Backblaze/Bunny/CDN hosts in components.

Implement reusable:

* media URL resolver based on canonical API response
* responsive image component
* avatar fallback
* pet-image fallback
* video display
* upload progress support
* attachment preview
* broken-media fallback

Do not expose private verification/KYC documents through public media components.

Create query keys consistently.

Prepare infinite-query helpers for:

* home feed
* comments
* people
* notifications
* messages
* fundraising
* adoption

Add tests for core API parsing/utilities.

Run verification.

---

# PROMPT 05 — Complete Home Feed + Post Creation + Single Post

Implement Furtail’s core social feed.

Build production-quality pages/components for:

HOME FEED

* For You / recommended feed when API supports it
* Following/Friends feed where supported
* appropriate feed filters
* infinite loading
* pull/refresh equivalent for web where useful
* skeleton state
* empty feed state
* retry state

POST COMPOSER
Support every canonical post capability actually available from Furtail API, including where supported:

* text
* images
* video
* multiple media
* pet attachment
* feeling/activity
* location
* audience/privacy
* tags/hashtags
* mentions
* fundraiser/adoption share
* polls only if backend really supports them

Do not create dead UI actions.

POST CARD
Implement:

* author avatar/name
* verification/badges if canonical
* timestamp
* audience
* text expansion
* hashtags/mentions
* image/video/gallery
* attached pet/fundraiser/adoption preview
* reactions
* comment count
* share/repost
* save
* three-dot actions

REACTIONS:
Use canonical backend reaction types.
If backend currently supports only LIKE, do not invent persisted reaction types unless implementing them fully end-to-end.

COMMENTS:

* add comment
* replies if supported
* reaction/like
* delete own comment
* moderation actions
* cursor pagination

SINGLE POST ROUTE:
Create a shareable route such as the canonical route defined in route map:

* /post/[id] or /posts/[id]

It must support:

* full post
* comments
* metadata
* not found
* deleted/private handling
* logged-out public visibility only when privacy allows

POST MANAGEMENT:

* edit own post if backend supports/needs it
* delete
* save/unsave
* report
* hide where applicable

Sharing must have:

* internal Furtail share/repost if supported
* copy link
* Web Share API where available

Implement optimistic updates only when rollback is safe.

Add tests for major post actions.

Run lint/typecheck/tests/build.

---

# PROMPT 06 — Explore + Search + Trending System

Implement Furtail discovery.

Create:

* Explore page
* global search
* search results
* trending page/sections

SEARCH DOMAINS:
Use actual supported API search capabilities and include applicable types:

* people
* pets
* posts
* fundraising campaigns
* adoption listings
* groups/communities if present
* hashtags/topics

Provide:

* debounced search
* recent searches stored safely client-side if appropriate
* result categories
* See All
* pagination
* no-results state
* search suggestions

TRENDING:
Audit whether trending endpoints already exist.

If missing, implement a production-quality backend trending service rather than fake client-side random ordering.

Possible canonical signals may include:

* recent post engagement
* comments
* reactions
* shares
* hashtag frequency
* recency decay

Avoid expensive unbounded queries.

Add proper indexes if backend schema genuinely requires them and migration is safe.

Trending UI should support:

* topics
* hashtags
* popular posts
* popular pets/people where appropriate
* trending fundraising/adoption content where appropriate

Create shareable topic/hashtag routes if supported:

* /hashtag/[tag]
  or canonical equivalent.

Do not expose private content in search/trending.

Run backend and frontend verification.

---

# PROMPT 07 — People, Friend Requests, Following and User Profiles

Implement the complete Furtail people/social-graph experience based on the actual backend model.

First determine whether Furtail canonical relationships are:

* friendship
* follow
* both

Do not create a duplicate relationship model.

Build:

PEOPLE PAGE

* suggestions
* discover people
* search
* mutual connection information where available
* attractive profile cards
* avatar fallbacks
* action buttons

FRIEND REQUESTS
If friendships exist:

* received requests
* sent requests
* accept
* reject
* cancel
* unfriend
* request state badges

FOLLOW SYSTEM
If follow exists:

* follow
* unfollow
* followers
* following
* counts

USER PROFILE
Create shareable public profile route using canonical public ID/username.

Profile should include as available:

* cover
* profile avatar
* name
* username
* bio
* location
* joined date
* social counts
* mutual friends
* friend/follow state
* message CTA
* posts
* media
* pets
* fundraising
* adoption content
* About information according to privacy
* report/block menu

OWN PROFILE

* edit profile
* avatar update
* cover update
* bio
* profile metadata
* privacy-aware fields

Use large branded fallback avatar/icon when profile image is missing.

Never show raw UUID as visible profile identity unless no public identifier exists.

If canonical public usernames do not exist and are necessary for URLs, assess carefully before modifying the database; preserve existing ID routes as compatible aliases if adding usernames.

Run verification.

---

# PROMPT 08 — Messenger-Quality Messaging + Realtime + Calls Foundation

Implement the complete Furtail Web messaging experience.

The interface should feel comparable in quality to modern Messenger/WhatsApp web experiences while remaining Furtail branded.

Audit the actual messaging backend first.

Implement:

MESSAGES HOME

* conversation list
* search
* unread badge
* last message preview
* timestamp
* online/presence state if supported
* avatar/group avatar
* loading/empty/error states

CONVERSATION

* conversation header
* recipient/group identity
* profile shortcut
* audio call button
* video call button
* three-dot menu
* chronological messages
* date separators
* sent/delivered/read status where supported
* reactions
* reply-to-message
* edit own message if supported
* delete/unsend according to backend rules
* copy
* report
* attachment previews
* image lightbox
* video
* documents if supported
* message composer
* emoji
* upload
* typing indicator
* scroll-to-bottom
* unread separator

NEW CONVERSATION

* search users/friends
* create DM
* avoid duplicate direct conversation
* group chat only if canonical backend supports it or after implementing required backend support

REALTIME:
Use the existing realtime transport if available.

If Furtail currently lacks realtime transport, implement a production-grade compatible solution in the API, preferably using the project’s existing server architecture rather than introducing an unnecessary separate service.

Realtime events should cover where supported:

* new message
* message updated/deleted
* typing
* read state
* conversation updated
* unread counter
* presence

Authenticate realtime connections.

Do not trust client-provided user IDs.

AUDIO/VIDEO:
Inspect whether real call signaling/WebRTC infrastructure exists.

If it exists, integrate it.

If it does not exist, do not create fake call buttons that pretend to work.

Instead implement the proper minimum end-to-end WebRTC calling foundation:

* call session model/state only if required
* authenticated signaling
* offer/answer
* ICE candidates
* incoming call UI
* outgoing call UI
* accept
* reject
* end call
* mute
* camera toggle
* device permission handling
* connection failure handling

Use browser WebRTC APIs.
Do not proxy media through the API unless architecture explicitly requires an SFU/media server.

Document TURN/STUN production requirements in `.env.example` without putting credentials in source.

If full multi-party calling requires infrastructure not presently available, support robust 1:1 calling first and clearly document multi-party as a separate future capability.

Run realtime/messaging tests plus frontend build.

---

# PROMPT 09 — Notifications Center + Cross-App Unread State

Implement the complete Furtail notification experience.

Audit notification types currently emitted by the API.

Support canonical types such as applicable:

* friend request
* friend accepted
* follow
* post reaction
* comment
* comment reply
* mention
* message
* fundraising
* adoption
* pet interaction
* system notices

Build:

* notification dropdown
* full notifications page
* unread count
* mark one read
* mark all read
* navigation to correct target
* grouped timestamps
* avatar/icon according to source entity
* empty/loading/error states
* realtime updates if backend supports them

Ensure message unread count and notification unread count do not conflict.

Deep links must resolve correctly to:

* user
* post
* conversation
* fundraiser
* adoption
* pet
  or other canonical target.

Invalid/deleted targets must fail gracefully.

Do not navigate using untrusted arbitrary URLs from notification payloads.

Run verification.

---

# PROMPT 10 — Fundraising Complete Web Experience

Implement Furtail fundraising on the web using the existing canonical fundraising architecture.

Inspect all Flutter fundraising screens, Furtail API routes, Prisma models and existing payment/media logic.

Do not simplify the existing canonical category/status/verification enums into incompatible display values.

Build:

FUNDRAISING DISCOVERY

* main fundraising page
* search
* category filters
* urgency/status filters
* featured/recommended campaigns if supported
* campaign cards
* progress
* amount raised
* goal
* contributors
* days/status
* pagination

SINGLE CAMPAIGN
Create shareable route:

* campaign media
* title
* organizer
* beneficiary
* category
* story
* goal/progress
* documents only when publicly allowed
* updates
* contributors where privacy allows
* donation/contribution CTA
* share
* report
* comments if canonical architecture supports them

CREATE CAMPAIGN
Implement full canonical flow:

* account eligibility
* account/KYC state
* category
* beneficiary
* urgency
* title
* story
* goal
* media
* required documents
* validation
* preview
* submit

EDIT/MANAGE

* my campaigns
* draft if supported
* edit eligible fields
* campaign status
* contributions
* updates
* close/cancel according to backend policy

FUNDRAISING ACCOUNT
Integrate existing fundraising account setup and verification document workflow.

Never expose private KYC documents through public URLs/CDN components.

PAYMENT/CONTRIBUTION:
Use canonical backend payment APIs.

Implement:

* amount
* contributor identity/privacy choices if supported
* payment initiation
* payment pending
* success
* failure
* retry
* idempotency
* callback/return handling
* contribution history

Do not mark payment successful from browser query parameters alone.
Server/backend must remain source of truth.

Use canonical stored enum values and separate human-readable labels.

Run both API and web tests.

---

# PROMPT 11 — Adoption Complete Web Experience

Implement the complete Furtail adoption experience.

Audit existing adoption models/routes/screens first.

Build:

ADOPTION HOME

* listing feed/grid
* search
* pet type
* breed
* sex
* age
* location
* adoption status
* suitable filters supported by backend
* saved/favorite if canonical

LISTING CARD

* pet photo
* pet name
* key facts
* location
* owner/rescue
* status
* posted time

SINGLE ADOPTION PAGE

* gallery
* pet details
* personality
* health/vaccination/deworming details only according to canonical schema/privacy
* adoption requirements
* owner/rescue info
* location
* share
* save
* report
* inquire/apply CTA

CREATE LISTING
Reuse pet registry data when a registered pet can be selected.

Avoid duplicating a Pet row solely to make an adoption listing.

Implement:

* pet selection/new appropriate flow
* listing description
* requirements
* location
* media
* contact preferences
* preview
* publish

OWNER MANAGEMENT

* my adoption listings
* edit
* pause
* mark adopted
* applications/inquiries

ADOPTER EXPERIENCE
If applications exist:

* apply
* application state
* withdraw if allowed
* message owner/rescue
* history

If backend lacks required adoption inquiry/application functionality, implement a minimal secure compatible backend contract.

Do not expose owner private contact details without consent.

Run verification.

---

# PROMPT 12 — Pet Registry + Pet Social Profiles

Implement the complete Furtail pet web experience based on the shared canonical Furtail pet registry.

Build:

MY PETS

* pet list
* create pet
* edit
* photo
* core details
* ownership controls

PET PROFILE
Create shareable route where privacy allows.

Include:

* photo/cover
* name
* species
* breed
* age/date of birth
* sex
* color
* weight where privacy/schema allows
* bio
* owner relationship according to privacy
* posts/media
* followers/following if pet social graph exists
* vaccination status summary if intended for public view
* adoption association
* fundraising association

PRIVATE PET HEALTH
Do not expose private veterinary/medical documents merely because the user can open the public pet profile.

Separate private owner-only sections where applicable:

* vaccination records
* weight records
* deworming
* medical history
* documents

Use real authorization.

PET SOCIAL ACTIONS:
Integrate canonical:

* pet follow
* pet like
* pet posts
  where these exist.

Add strong image fallback for pets without photos.

Run verification.

---

# PROMPT 13 — Saved Content, Groups/Communities, Events and Remaining Existing Modules

Use the feature matrix created earlier and complete all remaining Furtail API-backed social modules that have not yet been implemented.

At minimum implement Saved Content properly:

* saved posts
* saved fundraising
* saved adoption
* other save types only if canonical backend supports them

Then inspect whether Furtail currently has:

* groups
* communities
* events
* pages/organizations
* topic communities
* any other existing social modules

For each module marked IMPLEMENTED or PARTIAL in the audit:
finish the web experience end-to-end.

GROUPS/COMMUNITIES, IF SUPPORTED:

* discover
* search
* join/leave
* pending approval
* group detail
* feed
* members
* roles
* about
* rules
* moderators
* create/manage where allowed

EVENTS, IF SUPPORTED:

* discover
* detail
* RSVP
* participants
* create/manage according to permissions

Do not invent modules that have no place in the existing Furtail product merely to fill navigation.

Update the feature matrix after completion.

Run verification.

---

# PROMPT 14 — Settings, Privacy, Safety, Blocking and Reporting

Implement production-quality account/settings and safety controls.

Build settings pages for canonical supported preferences:

ACCOUNT

* profile settings
* account information
* linked Central Auth identity display
* security link/redirect to WPA Central Auth where Central Auth owns credential/security management
* logout

PRIVACY
Where supported:

* profile visibility
* post defaults
* friend/follow permissions
* messaging permissions
* discoverability
* blocked users

NOTIFICATIONS

* web notification preferences based on backend capabilities

APPEARANCE

* light/dark/system where supported

BLOCKING
Implement:

* block user
* unblock
* blocked users list
* hide blocked content correctly

REPORTING
Support relevant entities:

* user
* post
* comment
* message
* fundraiser
* adoption listing
* pet/profile where applicable

Reports must use backend moderation APIs.

Do not merely email a report from the frontend.

Provide:

* reason
* optional details
* submission confirmation

Ensure blocked users cannot bypass core restrictions merely through direct URLs/API calls.

Delete/deactivate account:
If Central Auth owns global identity deletion, do not locally delete the shared identity incorrectly.
Implement the canonical Furtail account deactivation/data workflow and link or coordinate with Central Auth where appropriate.

Run security-focused tests.

---

# PROMPT 15 — Public Landing, SEO, Share Pages, PWA, Accessibility and Performance

Complete the public-facing production experience.

LANDING PAGE:
Create a premium Furtail landing page using the established Furtail design language.

Sections may include:

* hero
* Furtail social network
* pet profiles
* adoption
* fundraising
* community
* messaging
* safety
* mobile applications
* CTA to sign in/register
* footer

Do not fill it with fake metrics.

PUBLIC SHAREABLE PAGES:
Ensure authorized public visibility and metadata for:

* profiles
* public posts
* fundraising campaigns
* adoption listings
* public pet profiles
* public groups/events if supported

Implement:

* dynamic page titles
* description
* canonical URL
* Open Graph metadata
* Twitter/X card metadata
* social share images using existing media or generated dynamic metadata where appropriate

Do not leak private information into server-rendered metadata.

PWA:
Add:

* manifest
* icons
* theme metadata
* installability baseline

Do not add broken offline mutation behavior.
If service worker caching is added, use a conservative strategy.

ACCESSIBILITY:
Audit:

* keyboard navigation
* focus visibility
* semantic buttons/links
* dialog focus traps
* form labels
* aria names
* contrast
* reduced motion
* screen-reader status for async mutations

PERFORMANCE:
Optimize:

* Next Image
* responsive media
* lazy loading
* code splitting
* bundle size
* caching strategy
* query invalidation
* feed rendering
* large list rendering where justified

Avoid overusing client components.

Add:

* robots behavior appropriate to environment
* sitemap for genuinely public indexable routes
* secure headers
* CSP compatible with actual media/auth domains
* referrer policy
* frame policy as appropriate

Run Lighthouse-oriented review where practical.

Run full build.

---

# PROMPT 16 — Final Gap Audit, E2E Verification and Production Readiness

Perform the final end-to-end completion audit for Furtail Web.

Do not assume earlier reports are correct.
Reinspect the actual current code.

Compare all three:

1.

D:\wpa\furtail\furtail_app_api

2.

D:\wpa\furtail\furtail_app

3.

D:\wpa\furtail\furtail_web

Also re-check the WPA Central Authentication contract.

Update:
docs/furtail-web-feature-matrix.md
docs/furtail-web-api-contract-map.md
docs/furtail-web-route-map.md

Every meaningful Furtail user-facing feature must now be classified as:

COMPLETE
NOT APPLICABLE
INTENTIONALLY DEFERRED WITH CONCRETE INFRASTRUCTURE REASON

There must be no vague “TODO later” for functionality that can be completed using the existing architecture.

VERIFY THESE FLOWS:

AUTH

* signed out landing
* login
* Central Auth callback
* session restore
* logout
* expired session

PROFILE

* current profile
* another user
* edit profile
* avatar fallback

SOCIAL

* create post
* media post
* feed
* reaction
* comment
* reply if supported
* save
* share
* single post
* delete/edit own content
* privacy

PEOPLE

* discover
* friend/follow
* request state
* user profile
* block/report

SEARCH

* search
* explore
* trending

MESSAGING

* open conversation
* send
* receive/realtime
* unread
* typing/read receipts where supported
* attachments
* call flow where implemented

NOTIFICATIONS

* unread
* mark read
* deep links

FUNDRAISING

* discover
* detail
* create
* edit/manage
* account verification
* payment initiation
* payment return/status
* contribution history

ADOPTION

* discover
* detail
* create
* manage
* inquiry/application

PETS

* list
* create/edit
* profile
* private health data authorization
* pet social features

SETTINGS/SAFETY

* preferences
* block
* report
* privacy

PUBLIC WEB

* SEO
* metadata
* responsive routes
* not found
* unauthorized/private behavior

RESPONSIVE:
Test representative sizes:

* wide desktop
* laptop
* tablet portrait
* mobile

Check:

* no horizontal overflow
* no inaccessible modal
* no clipped nav
* no unusable composer
* no broken image fallback

SECURITY REVIEW:

* no secrets in repo
* no token logged
* no localStorage long-lived sensitive token unless canonical architecture demands it
* no arbitrary redirect
* no IDOR
* no client-only authorization
* no public KYC URLs
* no unsafe HTML rendering
* upload type/size checks
* API validation
* rate limiting on sensitive new backend routes where appropriate

QUALITY:
Search entire web project for:
TODO
FIXME
mock
dummy
placeholder
localhost
example.com
hardcoded UUIDs
temporary bypasses
console.log
debug flags

Remove production-inappropriate leftovers.

TESTS:
Run all applicable frontend and backend checks.

Frontend must include at minimum:

* lint
* strict TypeScript check
* unit tests
* production build

Add Playwright end-to-end smoke tests for the main flows when practical and when the required test environment exists.

Backend:
Run relevant Furtail API tests and Prisma/static verification if backend changes were made.

Do not destroy or reset production data.

Do not run destructive migrations against production.

Create:
docs/furtail-web-production-checklist.md

The checklist must clearly separate:

AUTOMATICALLY VERIFIED
from
REQUIRES OPERATOR CREDENTIAL/PRODUCTION CONFIGURATION

Include required production configuration such as:

* Furtail API public/internal URL
* Central Auth issuer/client config
* callback URLs
* cookie/domain config
* allowed origins
* media/CDN config
* realtime URL
* STUN/TURN if calls are enabled
* payment callback configuration
* public Furtail web domain

FINAL REPORT MUST CONTAIN:

A. WEB APPLICATION STATUS

B. COMPLETE ROUTE LIST

C. COMPLETE FEATURE LIST

D. EXACT API ROUTES USED PER DOMAIN

E. NEW BACKEND ROUTES/MIGRATIONS, IF ANY

F. CENTRAL AUTH FLOW

G. REALTIME/MESSAGING ARCHITECTURE

H. AUDIO/VIDEO CALL STATUS

I. FUNDRAISING STATUS

J. ADOPTION STATUS

K. PET REGISTRY STATUS

L. TEST RESULTS

M. SECURITY AUDIT RESULTS

N. REMAINING MANUAL PRODUCTION CONFIGURATION

O. EXACT FILES CHANGED

P. FINAL PASS/FAIL

Do not describe the application as COMPLETE unless lint, typecheck and production build pass and no known critical user flow remains broken.
