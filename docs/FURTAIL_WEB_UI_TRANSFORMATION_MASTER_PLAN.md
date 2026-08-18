# Furtail Web UI Transformation

## Reference UI → Production Furtail Web App

---

# GLOBAL RULES — EVERY PHASE MUST FOLLOW THESE

You are working on the existing **Furtail Web App**.

The objective is to transform the current desktop/web UI into the polished modern social-community UI shown in the supplied reference screenshots, while preserving Furtail's own branding, pet/social functionality, existing API contracts, authentication, routes and data models.

## Non-negotiable rules

1. Do NOT rebuild the application from scratch.
2. Do NOT replace working backend integrations with mocks.
3. Do NOT introduce fake API endpoints.
4. Do NOT add fake users, fake posts, fake communities or hard-coded production content.
5. Existing real data/API responses must continue to drive the UI.
6. Before changing a component, inspect its:

   * current API calls
   * TypeScript types
   * state management
   * loading states
   * error states
   * realtime/SSE behavior where applicable
7. Keep WPA Central Auth / Furtail authentication intact.
8. Preserve existing:

   * posts
   * media
   * likes
   * comments
   * follows/friends
   * messaging
   * notifications
   * profile
   * adoption
   * fundraising
     functionality unless this phase explicitly changes its UI.
9. Never silently delete functionality because it is not shown in the reference design.
10. The reference screenshots are DESIGN REFERENCES, not a request to copy their fertility branding or content.
11. Adapt all UI to Furtail's pet/social ecosystem.
12. Do not move to the next phase automatically.
13. At the end of every phase:

* run lint/typecheck
* run relevant tests
* run production build
* report files changed
* report API contracts used
* report unresolved issues
* STOP and wait for the next command.

## Required design direction

Use a premium social-network visual language:

* Primary brand: existing Furtail purple
* White / very-light-neutral backgrounds
* subtle purple tint for active navigation
* clean rounded cards
* restrained borders
* subtle shadows
* compact typography
* high whitespace discipline
* consistent 8px spacing rhythm
* consistent radius system
* desktop-first but fully responsive
* accessible hover/focus/keyboard states
* no excessive gradients
* no giant oversized cards
* no arbitrary one-off CSS

Desktop should feel visually close to the supplied reference images while remaining recognizably Furtail.

---

# COMMAND 1 — FORENSIC UI AUDIT + DESIGN SYSTEM FOUNDATION

Your first job is NOT to redesign every page.

Perform a complete forensic audit of the current Furtail Web frontend and establish the reusable design system that all following phases will use.

## A. Audit the current application

Inspect:

* app router structure
* global layout
* header
* left sidebar
* right sidebar
* home/feed
* post card
* composer
* profile
* people/friends
* messages
* notifications
* adoption
* fundraising
* media rendering
* responsive breakpoints
* common UI primitives
* icons
* fonts
* spacing
* border radius
* shadows
* theme variables
* API client
* realtime/SSE behavior

Identify:

* duplicated UI
* inconsistent spacing
* duplicated avatar components
* inconsistent buttons
* inconsistent card styles
* fixed-width/layout problems
* responsiveness problems
* components that should be shared
* current working functionality that must not be damaged.

## B. Build the Furtail Design Foundation

Create/refactor reusable primitives instead of styling every page independently.

At minimum create or normalize:

* AppShell
* TopNavigation
* DesktopSidebar
* MobileNavigation
* PageContainer
* Surface/Card
* Avatar
* AvatarWithPresence
* IconButton
* PrimaryButton
* SecondaryButton
* GhostButton
* SearchInput
* SectionHeader
* TabBar
* EmptyState
* ErrorState
* LoadingSkeleton
* UserRow
* CountBadge
* Dropdown/Menu
* Modal/Dialog primitives

Create centralized design tokens for:

* brand purple
* purple hover
* purple soft background
* foreground
* muted foreground
* page background
* surface
* border
* destructive
* success/presence
* spacing
* radius
* shadows
* container widths

Prefer CSS variables / existing Tailwind theme architecture instead of scattered hard-coded values.

## C. Required responsive structure

Define a consistent application grid:

### Large desktop

* fixed/contained left navigation
* central content/feed
* context-aware right rail

### Medium desktop/tablet

* collapse/hide right rail first

### Small tablet/mobile

* collapse desktop sidebar
* use mobile navigation
* central content full width

Do not make desktop simply shrink horizontally.

## D. Visual target

The shell should visually move toward the reference UI:

* premium white desktop frame
* clean Furtail logo area
* top search
* compact icon actions
* clear active navigation state
* softly elevated content surfaces
* balanced page margins
* significantly less empty/dead space than the current implementation.

## E. Do NOT yet redesign individual feature pages

Do not deeply redesign:

* Home feed
* Communities
* Profile
* Post Detail
* Messaging

Those come later.

Only make enough changes required to prove that the shared shell/design system works.

## F. Verification

Run:

* lint
* TypeScript/typecheck
* relevant unit tests
* production build

Manually verify key routes at desktop and mobile widths.

## Final response format

Return:

A. Existing UI architecture discovered
B. Design-system problems discovered
C. Components/tokens created or refactored
D. Files changed
E. Responsive behavior implemented
F. Build/test results
G. Anything that could affect later phases
H. Screens/pages visually verified

Then STOP.

Do not start Phase 2.

---

# COMMAND 2 — GLOBAL APP SHELL + NAVIGATION + RESPONSIVE LAYOUT

Phase 1 is complete.

Now implement the final Furtail application shell based on the supplied reference screenshots.

Focus ONLY on navigation/layout infrastructure.

## A. Desktop top navigation

Create a polished sticky top bar containing:

* Furtail brand/logo
* global search field
* primary navigation shortcuts where appropriate
* Create/Post shortcut
* Messages shortcut
* Notifications shortcut
* current-user avatar/menu

Use existing routes and existing real unread counts where available.

Do not fake counters.

## B. Left navigation

Redesign the desktop sidebar to resemble the visual quality of the references while using Furtail functionality.

Primary items:

* Home
* Explore
* People
* Messages
* Notifications
* Fundraising
* Adoption
* Profile
* Settings

If additional existing routes are genuinely important, place them under a "More" pattern rather than overcrowding the navigation.

Requirements:

* active item uses soft-purple background
* purple active icon/text
* muted inactive icons
* consistent icon size
* consistent row height
* hover state
* focus-visible state
* tooltips where appropriate
* current-user identity area at bottom if suitable

## C. Responsive behavior

Desktop:

* left rail visible
* center page constrained
* optional right rail

Tablet:

* right rail disappears first
* center content expands

Mobile:

* no permanent desktop rail
* use compact top bar and mobile navigation
* preserve access to all important sections

## D. Layout engineering

Ensure:

* no horizontal overflow
* no arbitrary fixed viewport widths
* no broken sticky elements
* correct z-index hierarchy
* predictable scrolling
* feed/content scroll remains natural
* dialogs/dropdowns are not clipped

## E. Preserve functionality

Do NOT redesign the actual feed cards yet.

Do NOT alter API response schemas.

Do NOT rewrite backend endpoints.

## F. Verification

Test at approximately:

* 1440px
* 1280px
* 1024px
* 768px
* 390px

Run lint, typecheck, tests and production build.

Report:

A. Shell changes
B. Navigation changes
C. Responsive breakpoints
D. Files changed
E. Functional regressions checked
F. Build/test results

Then STOP.

Do not start Phase 3.

---

# COMMAND 3 — HOME FEED + COMPOSER + POST CARD + RIGHT RAIL

The shared design system and application shell are complete.

Now redesign ONLY the Home experience using the supplied reference images as the visual target.

The Home page should become the primary polished social-feed experience for Furtail.

## A. Home header

Implement a clean page header with:

* Home title
* feed selector/tabs such as:

  * For You
  * Following

Only expose a tab if the backend actually supports the corresponding dataset/filter.

Do not fabricate a "Trending" system unless a real backend capability exists.

## B. Post composer

Transform the basic "What's on your mind?" area into a richer Furtail composer.

Collapsed composer should include:

* current-user avatar
* "What's on your mind?" input trigger
* Photo/Video
* optional Feeling/Activity if currently supported
* other supported Furtail post types

Clicking the composer should open the full Create Post experience that will be finalized later.

Do not expose unsupported controls.

## C. Feed post cards

Redesign the post component.

Header:

* author avatar
* display name
* username
* timestamp
* privacy/context indicator where real data exists
* overflow menu

Body:

* caption/text
* "See more" for long posts
* media

Footer:

* reaction/like count
* comment count
* share if supported
* interaction buttons

Actions should have polished hover/active states.

## D. Media rendering

This is extremely important.

Use the current normalized media contract and existing media URL helper.

Support existing Furtail post media correctly:

* image
* multiple image layout where supported
* video
* media unavailable/error fallback

Never construct a URL from undefined.

Never regress the previously repaired nested media normalization.

Images should:

* preserve sensible aspect ratios
* use responsive containers
* avoid distorted stretching
* use object-cover only where cropping is appropriate
* provide graceful loading/error state

## E. Comments preview

If existing comments API is available:

* show limited preview under a post where appropriate
* show "View all X comments"
* clicking should navigate/open the complete post detail

Do not fake nested comments.

## F. Right rail

Create a context-aware right sidebar visually similar to the references.

Use real supported data for items such as:

* Suggested for you
* People you may know
* Suggested communities, later when backend exists
* useful Furtail discovery content

If only user suggestions are currently supported, show only that.

No fake trending topics.

## G. Loading / empty / error

Add polished:

* feed skeleton
* suggestions skeleton
* empty feed state
* API error state
* retry action where appropriate

Avoid layout jumping.

## H. Performance

Prevent unnecessary:

* duplicated feed requests
* duplicate image requests
* duplicate SSE subscriptions
* re-render storms

## I. Verification

Verify:

* actual posts appear
* real media appears
* likes still work
* comment navigation still works
* following/suggestion actions still work
* failed images degrade correctly
* responsive Home layout works

Run lint, typecheck, tests and production build.

Report:

A. Home UI implemented
B. APIs preserved/used
C. Post/media behavior
D. Right-rail behavior
E. Files changed
F. Functional tests
G. Build/test results

Then STOP.

Do not start Phase 4.

---

# COMMAND 4 — COMMUNITIES / PEOPLE / PROFILE / POST DETAIL / CREATE POST

Home is complete.

Now redesign the social discovery and content-detail experiences based on the supplied reference UI.

Do not invent backend functionality.

## SECTION A — People / Community discovery

First inspect what the backend genuinely supports:

* follow
* friend request
* friend list
* suggestions
* active users
* communities/groups, if any

If a proper Communities backend does NOT exist:

* do not create fake communities
* do not build a fake production feature
* prepare the UI architecture only where helpful
* keep People/Friends as the working discovery experience
* report what backend models/endpoints would be required for Communities

If Communities ARE supported, implement:

* My Communities
* Discover Communities
* category/filter tabs
* member counts
* Join/Joined actions
* community cards
* community detail shell

## SECTION B — People/Friends

Create polished:

* suggested people cards/rows
* follow/add friend actions
* current friends
* active friends
* presence indicator
* last-seen text where backend data exists

Presence:

* green dot for active/online
* "Active now" if real
* "5m ago", "10m ago", etc. only from real presence timestamps

No fake online state.

## SECTION C — Profile

Redesign profile to match the visual hierarchy of the references.

Include real supported data:

* cover/banner
* profile picture
* display name
* username
* bio
* location if available
* joined date if available
* counts
* follow/friend action
* edit profile for own profile
* more menu

Tabs should be based on real functionality, such as:

* Posts
* About
* Saved if permitted/private
* Pets, if appropriate for Furtail
* other existing Furtail-specific areas

Use the Furtail domain rather than blindly duplicating reference tabs.

## SECTION D — Post detail

Create a dedicated polished post detail view:

* Back control
* complete post
* engagement summary
* comments
* reply action only if backend supports it
* comment composer
* loading/error states

Do not fake threaded comments if backend does not support threading.

## SECTION E — Create Post modal

Create the polished modal seen conceptually in the references but tailored to Furtail.

Must include:

* current user
* audience/privacy selector only if supported
* text area
* media picker
* image/video preview
* remove attachment
* upload progress
* submit state
* errors
* character/validation rules from current backend

Never allow UI options that backend rejects.

Reuse the existing post creation API.

## Verification

Verify:

* profile loads
* another user's profile loads
* follow/friend actions function
* presence does not display fabricated values
* post creation works
* media post creation works
* comments work
* responsive layout works

Run lint, typecheck, tests and production build.

Report each section separately:

A. People/Communities
B. Friends/presence
C. Profile
D. Post detail/comments
E. Create Post
F. Backend capabilities missing
G. Files changed
H. Build/test results

Then STOP.

Do not start Phase 5.

---

# COMMAND 5 — MESSAGING EXPERIENCE

Previous sections are complete.

Now redesign ONLY Furtail messaging into a polished Messenger-style experience inspired by the supplied references.

Preserve the existing messaging API and realtime architecture.

## A. Messages inbox

Implement:

* Messages heading
* search conversations
* All / Unread or other tabs only if supportable
* conversation list
* 56px-ish polished avatar presentation
* online indicator from real presence
* participant name
* latest message
* timestamp
* unread badge
* bold unread rows
* attachment/deleted-message preview
* skeleton loading
* empty state

## B. Conversation header

Display:

* participant avatar
* participant name
* Active now / last seen where real
* audio button if supported
* video button if supported
* conversation info/menu

If calling is not implemented, do not create a fake working call button.

Either:

* omit it, or
* render a clearly disabled/coming-later control only if product direction requires it.

## C. Chat messages

Implement:

* own vs recipient bubbles
* sensible max width
* grouped consecutive messages
* timestamp grouping
* date separators
* text messages
* image messages
* video messages
* audio messages where existing API supports them
* deleted-message tombstones
* sending state
* failed state
* retry
* message actions

## D. Read receipts

Implement the requested Messenger-like read behavior using real receipt data.

When the other participant has viewed messages:

* show their small profile avatar beside/below the latest message they have read
* do not show it on every message unnecessarily
* move the avatar to the latest read message as read position advances

If the backend does not yet expose reliable per-message read position:

* identify exact backend changes required
* do not fake the receipt

## E. Typing indicator

If existing realtime events support typing, use them.

Otherwise identify and implement the minimal correct realtime backend/frontend addition, if this repository/phase legitimately includes both sides and it can be done without damaging the current messaging contract.

Requirements:

* debounce/throttle typing events
* automatically expire stale typing state
* do not persist typing events to DB
* no excessive websocket/SSE traffic

## F. Message media policy

Messaging attachments must enforce the Furtail rules:

Allowed:

* images
* videos
* audio

Disallowed:

* arbitrary documents
* executable files
* archives
* unrelated file types

Maximum original upload:

* 100 MB per file

Images:

* compress/resize client/server appropriately
* retain correct dimensions/aspect ratio
* reduce excessive resolution/file size
* aim for efficient social-media delivery without visibly destroying quality

Do not stretch or distort images.

## G. Preserve duplicate-message fix

Do NOT regress optimistic/realtime message reconciliation.

Continue to reconcile using a stable clientMessageId or current equivalent so that:

* optimistic outgoing message
* realtime echo
* server response

resolve into ONE message, not duplicates.

## H. Responsive messaging

Desktop:

* conversation list + active thread

Mobile:

* inbox route
* conversation route
* back navigation

Avoid unusably narrow split panes on phones.

## I. Verification

Test:

* send text
* send image
* send video
* send audio if supported
* attachment rejection
* oversized file rejection
* optimistic state
* SSE/realtime echo
* duplicate prevention
* unread badge
* read receipt
* presence
* typing
* deleted message
* conversation search
* responsive mobile/desktop

Run lint, typecheck, tests and production build.

Report:

A. Inbox
B. Chat UI
C. Realtime behavior
D. Read receipts
E. Presence
F. Typing
G. Media attachments
H. Duplicate prevention
I. Backend changes, if any
J. Files changed
K. Build/test results

Then STOP.

Do not start Phase 6.

---

# COMMAND 6 — FINAL PRODUCT POLISH, RESPONSIVENESS, ACCESSIBILITY & REGRESSION AUDIT

The major Furtail UI sections are now complete.

Perform the final production-readiness pass.

Do not introduce a major redesign in this phase.

## A. Visual consistency audit

Check all transformed screens for:

* spacing
* typography
* icon sizing
* card radius
* button height
* input height
* avatar sizing
* border color
* shadow consistency
* active navigation
* hover states
* loading skeletons
* empty states
* error states

Remove one-off styling that conflicts with the design system.

## B. Responsive audit

Verify key pages at:

* 1536
* 1440
* 1280
* 1024
* 768
* 430
* 390
* 360

Pages:

* Home
* Explore/People
* Messages
* Conversation
* Notifications
* Profile
* Post Detail
* Adoption
* Fundraising
* Settings
* Create Post modal

Check:

* overflow
* clipped text
* unusable buttons
* hidden actions
* broken sticky regions
* scroll conflicts
* modal sizing

## C. Accessibility

Verify:

* keyboard navigation
* visible focus
* semantic buttons/links
* correct labels
* modal focus trap
* Escape handling
* aria labels for icon-only controls
* sufficient contrast
* sensible heading structure
* reduced motion where relevant

## D. Performance

Audit:

* unnecessary client components
* duplicate API requests
* duplicate realtime connections
* heavy images
* unoptimized media
* avoidable rerenders
* oversized JS bundles
* layout shift

Do not prematurely rewrite architecture without measurable reason.

## E. Regression audit

Explicitly verify existing Furtail functionality was not lost:

* authentication
* feed
* media
* likes
* comments
* follow/friends
* discovery
* profile
* messages
* realtime
* notifications
* fundraising
* adoption
* settings

No production feature may disappear solely because the reference screenshots did not contain it.

## F. No fake functionality audit

Search for newly introduced:

* hard-coded users
* hard-coded posts
* fabricated counts
* fake trends
* fake communities
* fake online states
* placeholder API responses
* TODO controls exposed as functioning buttons

Remove them or convert them to proper empty/disabled states.

## G. Final verification

Run the complete available frontend validation suite:

* lint
* typecheck
* unit/component tests
* integration tests where available
* production build

Also inspect console/network behavior for:

* React key warnings
* hydration warnings
* 404 assets
* failed media URLs
* duplicate requests
* runtime exceptions

## FINAL REPORT

Return a consolidated production report:

A. Final design architecture
B. Screens completed
C. Existing APIs preserved
D. Backend features still missing
E. Responsive verification
F. Accessibility verification
G. Performance improvements
H. Regression results
I. Test/build results
J. Remaining issues ranked Critical / High / Medium / Low
K. Exact recommended next development phase

Do not make unrelated changes after the report.
