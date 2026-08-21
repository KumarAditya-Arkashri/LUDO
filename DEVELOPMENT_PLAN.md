# Development Plan: Ludo Arena Pro

This plan outlines the prioritized phases to transition the Ludo Arena frontend from a mocked prototype to a production-ready application integrated with a secure backend.

## Phase 1: Core Backend Integration & Authentication (Weeks 1-2)
**Goal:** Replace all mock data with real API calls and establish secure sessions.
1. **API Client Setup:** 
   - Configure Axios or standard `fetch` with interceptors to handle JWT injection and token refresh.
   - Set up `@tanstack/react-query` hooks for data fetching.
2. **Authentication Flow:**
   - Wire `auth-store.ts` to backend `/auth/login` and `/auth/register` endpoints.
   - Implement secure token storage.
   - Add route guards in `@tanstack/react-router` to protect authenticated routes (`_player.*`, `admin.*`).
3. **User Profile & Settings:**
   - Fetch real user data for the dashboard.
   - Enable profile updates (avatar, name) via the backend.

## Phase 2: Wallet & Payment Gateway Integration (Weeks 2-3)
**Goal:** Ensure secure, verifiable real-money transactions.
1. **Wallet Synchronization:**
   - Replace mock balances in `wallet-store.ts` with real-time backend ledger data.
   - Fetch paginated transaction history from the API.
2. **Deposits (Payment Gateway):**
   - Integrate the payment gateway SDK (e.g., Razorpay, Cashfree, or UPI deep links).
   - Implement webhooks handling and real-time status polling for deposit verification.
3. **Withdrawals & KYC:**
   - Wire withdrawal requests to the backend.
   - Add KYC upload and verification status UI components.

## Phase 3: Real-Time Game Engine Integration (Weeks 4-5)
**Goal:** Transition from client-side simulation to a server-authoritative multiplayer game.
1. **Socket.IO Setup:**
   - Install `socket.io-client` and configure the connection in `src/lib/socket.ts`.
   - Implement connection lifecycle management (connect, disconnect, reconnect, error handling).
2. **Matchmaking & Waiting Room:**
   - Connect the waiting room UI to matchmaking socket events (`room:join`, `room:leave`, `game:start`).
3. **Refactoring Game Store:**
   - Strip out all client-side logic for dice rolling, token capturing, and turn progression from `game-store.ts`.
   - Implement Socket event listeners that blindly mutate the local `GameState` based on server broadcasts (`game:state`, `game:turn-change`).
   - Wire user interactions (clicking a token, rolling dice) to emit socket events (`game:roll-dice`, `game:move-token`) instead of updating local state directly.
4. **Timer & Disconnect Handling:**
   - Sync the 20-second turn timer strictly with server timestamps to avoid client clock drift.
   - Add UI for opponent disconnection and reconnection grace periods.

## Phase 4: Admin Dashboard & Operations (Week 6)
**Goal:** Provide full operational control to administrators.
1. **Admin Data Fetching:**
   - Wire the admin dashboard routes to fetch real system metrics, active matches, and user counts.
2. **Approval Workflows:**
   - Implement API calls for approving/rejecting manual deposit UTRs and withdrawal requests.
3. **Game Management:**
   - Implement controls to view live games, resolve disputes, or refund entry fees.

## Phase 5: Polish, Performance, and Security Audit (Week 7)
**Goal:** Prepare for production launch.
1. **Security Review:**
   - Ensure the client never sends authoritative state (e.g., trusting a client-provided dice roll).
   - Audit for XSS and CSRF vulnerabilities.
2. **Performance Optimization:**
   - Optimize Ludo board rendering (memoization, preventing unnecessary re-renders during high-frequency socket updates).
   - Ensure smooth 60fps animations for token movements.
3. **Error Handling & Analytics:**
   - Refine the existing Lovable error reporting.
   - Integrate product analytics to track user drop-offs, payment failures, and game completions.
