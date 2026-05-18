# Social Web App — Build Plan (7 Phases)

A responsive social web app where users sign in with Google, post, like, comment, reply, share, chat (emoji-only), and manage profiles. Everything runs in Docker.

## Stack

- **Frontend**: Next.js 14 (App Router) + React + TailwindCSS — responsive mobile/tablet/desktop
- **Backend**: Node.js + Express (REST) + Socket.IO (real-time chat)
- **Database**: PostgreSQL + Prisma ORM
- **Cache / Pub-Sub**: Redis (sessions, socket scaling, rate limit)
- **Auth**: NextAuth.js with Google OAuth provider (Google-only login)
- **Storage**: Local Docker volume for uploaded profile pictures (optional uploads)
- **Orchestration**: Docker Compose (one network, named volumes for db / redis / uploads)
- **Reverse proxy** (prod): Nginx serving frontend + proxying `/api` and `/socket.io`

## Default Profile Pictures

When a user has no profile picture, the app picks one at random from a curated list bundled in the repo at `frontend/public/avatars/`. Suggested set (12 images, royalty-free or self-generated):

```
avatar-01.png  avatar-02.png  avatar-03.png  avatar-04.png
avatar-05.png  avatar-06.png  avatar-07.png  avatar-08.png
avatar-09.png  avatar-10.png  avatar-11.png  avatar-12.png
```

The default is chosen deterministically by `hash(userId) % 12` so the same user always sees the same default.

## Hard Rules

- **Login/Register**: Google OAuth **only** — no email/password, no other providers.
- **Comments**: text only, no attachments. Emoji allowed (Unicode passes through).
- **Chat**: emoji-only messages. Server validates each message contains *only* emoji + whitespace; rejects anything else. No file attachments.
- **Posts**: text + optional image (image only on posts, not on comments/chat).
- **Responsive**: every screen tested at 360px / 768px / 1280px.

---

## Phase 1 — Project Skeleton & Docker Foundation ✅

**Goal**: a runnable empty shell where `docker compose up` brings the whole stack online.

- Create monorepo layout:
  ```
  /frontend        Next.js app
  /backend         Express + Socket.IO API
  /db              init scripts (if any)
  /nginx           reverse-proxy config (prod)
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  ```
- Dockerfiles for `frontend` and `backend` (multi-stage; dev target with hot-reload via bind mounts, prod target with built artifacts).
- `docker-compose.yml` services: `frontend`, `backend`, `postgres`, `redis`, with named volumes `pg_data`, `redis_data`, `uploads`.
- `.env.example` covering: `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_URL`, `FRONTEND_URL`.
- Health endpoints: `GET /api/health` (backend) and `/healthz` (frontend).
- Root `README.md` with one-command bring-up instructions.

**Done when**: `docker compose up` shows healthy frontend at `localhost:3002`, backend at `localhost:4000/api/health` returns `200`, and Postgres + Redis are reachable from the backend container.

---

## Phase 2 — Auth (Google-only) & User Accounts ✅

**Goal**: a user can sign in with Google, see their session, and sign out. No other auth path exists.

- Configure Google OAuth credentials (instructions in README; consent screen, redirect URIs for dev + prod).
- NextAuth.js in the frontend with **only** the Google provider; persist sessions in JWT signed with `NEXTAUTH_SECRET`.
- On first login, create a `User` row via backend (`POST /api/users/sync`) using a server-to-server shared token, or via Prisma adapter.
- Prisma schema (initial):
  - `User { id, googleId, email, displayName, handle, bio, profilePicture (nullable), createdAt, updatedAt }`
  - `Session` (if using DB sessions) — otherwise rely on NextAuth JWT.
- Backend middleware that verifies the NextAuth JWT on every `/api/*` request and attaches `req.user`.
- Login page with a single "Continue with Google" button. Logged-in users redirected to `/feed`.
- Sign-out clears session and redirects to landing.

**Done when**: a fresh user can click "Continue with Google", land on `/feed` (empty), refresh and remain logged in, and sign out.

---

## Phase 3 — Profiles (View, Edit, Default Avatars) ✅

**Goal**: every user has a viewable profile and can edit their own.

- Routes:
  - `GET /api/users/:handle` — public profile
  - `PATCH /api/users/me` — update `displayName`, `handle`, `bio`, `profilePicture`
  - `POST /api/users/me/avatar` — multipart upload (image only, ≤2 MB, jpg/png/webp), stored under `/uploads/avatars/<userId>.<ext>`; served by backend at `/uploads/...`
  - `DELETE /api/users/me/avatar` — revert to a random default
- Frontend pages:
  - `/u/[handle]` — profile view (avatar, name, handle, bio, post count, follower/following counts placeholders for Phase 5)
  - `/settings/profile` — edit form with live preview, drag-and-drop avatar upload
- Avatar resolution helper `getAvatarUrl(user)`: returns uploaded URL if present, else `/avatars/avatar-{(hash(user.id) % 12) + 1).padStart(2)}.png`.
- Validation: handle is unique, 3–20 chars, `[a-z0-9_]`. Display name 1–40 chars. Bio ≤160 chars.

**Done when**: any user can view another's profile, update their own, upload/remove an avatar, and unauthenticated profile views work.

---

## Phase 4 — Posts, Likes, Comments, Replies, Comment-Likes, Share ✅

**Goal**: the core social graph of content.

- Prisma additions:
  - `Post { id, authorId, body, imageUrl?, createdAt, updatedAt }`
  - `Comment { id, postId, authorId, parentCommentId? (for replies), body, createdAt }`
  - `Like { id, userId, targetType (POST|COMMENT), targetId, createdAt, UNIQUE(userId, targetType, targetId) }`
  - `Share { id, userId, postId, createdAt }` — tracks share events for the count
- Backend routes:
  - `POST /api/posts`, `GET /api/posts/:id`, `GET /api/feed?cursor=` (newest first, keyset pagination), `DELETE /api/posts/:id` (author only)
  - `POST /api/posts/:id/comments` (top-level), `POST /api/comments/:id/replies`, `GET /api/posts/:id/comments` (threaded, depth-limited to 1 level of nesting; further replies flatten)
  - `POST /api/likes` `{targetType, targetId}`, `DELETE /api/likes` (toggle)
  - `POST /api/posts/:id/share` — generates a shareable URL `/p/:postId`; increments share count; returns URL for the client to copy / hand to the OS share sheet
  - `POST /api/users/:id/share` — same idea for sharing a user profile (`/u/:handle`)
- Frontend:
  - Feed at `/feed` with infinite scroll, post composer (text + optional image upload to `/uploads/posts/`)
  - Post detail at `/p/[postId]` with comments + replies, like buttons on post and each comment
  - Share button: copies link to clipboard and triggers `navigator.share` if available
- Validation: post body ≤2000 chars, comment ≤500 chars, image ≤4 MB.

**Done when**: a user can create a post (with or without image), like/unlike it, comment, reply to comments, like comments, share a post or a profile (link copied to clipboard), and see counts update without a full page reload.

---

## Phase 5 — Real-Time Chat (Emoji-Only) ✅

**Goal**: 1:1 chat between any two users with strict emoji-only messages.

- Prisma additions:
  - `Conversation { id, createdAt }`
  - `ConversationMember { conversationId, userId, lastReadAt, UNIQUE(conversationId, userId) }`
  - `Message { id, conversationId, senderId, body, createdAt }`
- Backend:
  - `GET /api/conversations` — list current user's conversations with last message + unread count
  - `POST /api/conversations` `{withUserId}` — finds or creates a 1:1 conversation
  - `GET /api/conversations/:id/messages?cursor=` — keyset pagination, newest first
  - Socket.IO namespace `/chat` authenticated via the same NextAuth JWT
  - Events: `message:send`, `message:new`, `typing:start`, `typing:stop`, `read:update`
  - Redis adapter for Socket.IO so chat scales horizontally
- **Emoji-only validator** (server-side, source of truth): regex over Unicode emoji property classes — accept only characters matching `\p{Extended_Pictographic}`, ZWJ, variation selectors, regional indicators, and whitespace. Reject otherwise with `400 INVALID_CONTENT`. Same check on the client for instant feedback, but the server check is authoritative.
- Frontend `/chat` page: conversation list on the left (collapses to a drawer on mobile), message thread on the right, emoji picker (e.g., `emoji-mart`) as the **only** input. The text input is non-editable for plain typing — selections from the picker append to the outgoing buffer.
- Rate limit: 30 messages / 10 seconds per user per conversation (Redis token bucket).

**Done when**: two users in two browsers can open `/chat`, start a conversation, exchange emoji messages in real time, see typing indicators and read receipts; any non-emoji input is rejected by the server with a visible error.

---

## Phase 6 — Polish: Responsive UX, Notifications, Search, Discovery ✅

**Goal**: the app feels finished on phone, tablet, and desktop.

- Responsive audit at 360 / 768 / 1280; fix any overflow / tap-target issues. Use Tailwind breakpoints `sm md lg xl`.
- Bottom navigation on mobile (Feed / Search / Chat / Profile); top sidebar on desktop.
- In-app notifications:
  - `Notification { id, userId, type (LIKE|COMMENT|REPLY|FOLLOW|MENTION|MESSAGE), actorId, targetType, targetId, readAt?, createdAt }`
  - Real-time delivery via Socket.IO `/notifications` namespace
  - Bell icon with unread count
- Search:
  - `GET /api/search?q=...&type=users|posts` (Postgres `to_tsvector` for posts; trigram for handles/display names)
- Empty states, loading skeletons, optimistic UI for likes/comments.
- Accessibility pass: keyboard nav, focus rings, alt text, ARIA labels, color contrast.
- Dark mode (system preference + toggle).

**Done when**: every page is usable and pleasant on a 360px viewport, all interactive elements are keyboard-accessible, and notifications appear in real time.

---

## Phase 7 — Hardening, Production Docker, Deploy ✅

**Goal**: production-ready, observable, and deployable with one command.

- Security:
  - Helmet, CORS locked to `FRONTEND_URL`, CSRF on state-changing non-Bearer requests
  - Input validation (zod) on every backend route
  - Rate limits per route family (auth, post create, message send) via `express-rate-limit` + Redis store
  - File-upload validation: magic-byte sniff, size cap, randomized filename
- Observability:
  - Structured logs (pino) with request IDs
  - `/metrics` endpoint (Prometheus format) on backend
  - Health checks wired into Docker (`HEALTHCHECK` in each Dockerfile)
- Tests:
  - Backend: Vitest/Jest unit tests for the emoji validator, like-toggle, feed pagination
  - E2E: Playwright covering login → post → comment → like → chat
  - CI: GitHub Actions runs `docker compose -f docker-compose.test.yml up --abort-on-container-exit`
- Production compose (`docker-compose.prod.yml`):
  - Nginx in front, terminating TLS (Let's Encrypt via certbot sidecar or Caddy alternative)
  - Frontend and backend run as non-root users
  - Postgres with backups (nightly `pg_dump` to a bind-mounted host directory)
  - Resource limits (`mem_limit`, `cpus`) per service
- Deploy doc in `DEPLOY.md`: provision a VM, set DNS, write `.env.prod`, `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`.

**Done when**: a freshly cloned repo on a clean VM, given a domain and Google OAuth credentials, comes up with `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`, serves over HTTPS, passes the Playwright E2E suite against the live URL, and survives a container restart with no data loss.

---

## Cross-Cutting Conventions

- All times stored in UTC; rendered in the user's locale on the client.
- IDs are CUIDs (Prisma default).
- Every list endpoint uses keyset pagination (`?cursor=`), never `OFFSET`.
- Every mutation route requires auth except `GET /api/users/:handle` and `GET /api/posts/:id`.
- No secrets in the repo; `.env` is gitignored, `.env.example` is the source of truth for required variables.

## Out of Scope (explicit non-goals)

- Email/password or non-Google login
- File or image attachments in comments or chat
- Group chats / channels (1:1 only in Phase 5; can extend later)
- Mobile native apps (web is responsive; PWA install is a stretch goal)
- Stories, video posts, live streaming
