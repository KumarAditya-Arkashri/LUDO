# Engineering Audit Report: Ludo Arena Pro

## 1. Architecture
The frontend is a Single Page Application (SPA) built with React 19, Vite, and TypeScript. It relies on modern toolchains including Bun for package management and Tailwind CSS (v4) for styling. The application connects to a NestJS-based backend (as indicated by comments in the codebase), although the real-time game logic is currently simulated on the client-side. The architecture follows a strict separation of concerns, dividing the app into UI components, routing, state management, and API/socket boundaries.

## 2. Folder Structure
The codebase follows a well-organized, domain-centric folder structure:
- `src/components/`: Contains React components, subdivided by domain:
  - `brand/`: Logo and branding elements.
  - `common/`: Shared UI components (e.g., `ui-kit.tsx`).
  - `game/`: Game-specific components (e.g., `ludo-board.tsx`, `dice.tsx`, `player-panel.tsx`).
  - `layout/`: Global layout components.
  - `ui/`: Generic, reusable Shadcn UI components.
- `src/hooks/`: Custom React hooks.
- `src/lib/`: Utility functions, socket configuration, formatting, and mock data.
- `src/routes/`: File-based routing using `@tanstack/react-router`. Contains views for player dashboard, admin panel, game room, auth, etc.
- `src/store/`: Zustand stores for state management (`game-store.ts`, `auth-store.ts`, `wallet-store.ts`).
- `src/types/`: TypeScript definitions for the domain models (User, Wallet, Transaction, GameState, etc.).

## 3. Reusable Components
The project heavily leverages reusable components:
- **Shadcn UI / Radix Primitives**: Used for accessible, unstyled core components (dialogs, tabs, progress, dropdowns) customized via Tailwind.
- **Glassmorphism UI Kit**: Custom reusable components (`GlassPanel`) for consistent styling.
- **Game Components**: `LudoBoard`, `Dice`, and `PlayerPanel` act as pure, reusable views that receive state from the parent `GameScreen`.

## 4. State Management
State management is handled entirely by **Zustand**.
- `game-store.ts`: Manages the complex state of the Ludo board, turns, dice rolls, and token positions. Currently contains client-side simulation logic.
- `auth-store.ts`: Manages the user session, authentication status, and profile updates. Currently mocked.
- `wallet-store.ts`: Manages the user's balances (main, winning, referral) and transactions. Currently relies on mock data.

## 5. Routing
Routing is implemented using **@tanstack/react-router**, providing type-safe, file-based routing.
- The `__root.tsx` serves as the root layout, handling error boundaries (with Lovable error reporting) and the QueryClient provider.
- Routes are organized into player routes (`_player.*`), admin routes (`admin.*`), and public/game routes (`login`, `register`, `game`, `waiting-room`).

## 6. Missing Backend Integration
- **Authentication**: `auth-store.ts` uses hardcoded demo users and dummy JWT tokens instead of hitting backend endpoints (e.g., `/auth/login`).
- **Wallets & Payments**: `wallet-store.ts` uses mock transactions. The deposit and withdrawal requests are simulated locally and do not interact with a payment gateway or backend ledger.
- **Real-time Engine**: The Socket.IO connection in `src/lib/socket.ts` is stubbed out. The `connectGameSocket` function returns `null` and needs to be wired to the `socket.io-client` library.

## 7. Missing Security
- **Authoritative Server**: Because this is a real-money game, the client cannot be trusted. Currently, dice rolls and token movements are calculated locally in `game-store.ts`. These must be moved to the backend to prevent cheating.
- **Authentication**: No real token validation, CSRF protection, or secure HttpOnly cookie configuration is present on the client yet.
- **Wallet Security**: Transactions are not cryptographically signed or verified against a backend ledger on the client side.

## 8. Missing Game Logic
- **Multiplayer Sync**: The game store simulates an opponent's move using `setTimeout`. Real multiplayer synchronization handling (lag compensation, state reconciliation, network drops, and reconnection logic) is absent.
- **Turn Timeouts**: While a 20-second timer exists locally, the server needs to enforce this timer and forcefully end a turn or auto-play if a user disconnects or times out.
- **Advanced Ludo Rules**: Potential edge cases for token overlapping, consecutive sixes, or capturing rules might lack complete server-side verification in the current client-side mock.

## 9. Scalability Issues
- **WebSocket Connections**: The frontend is prepared to connect to a Socket.IO backend. Depending on the backend implementation, handling thousands of concurrent real-time game rooms will require Redis pub/sub adapters for horizontal scaling.
- **Client-Side Processing**: The client currently processes game events, which will bottleneck on lower-end devices. Moving this to a purely event-driven "dumb client" architecture (where the client only renders `gameState` from the server) will drastically improve client performance.

## 10. Technical Debt
- **Mock Data**: Extensive use of mock data (`src/lib/mock-data.ts`, `demoUser`) that needs to be systematically replaced with API calls (likely using React Query).
- **Client-Side Simulation**: The simulation logic in `game-store.ts` (`rollDice`, `moveToken`, opponent simulation) needs to be completely gutted and replaced with Socket.IO event listeners. Keeping this logic in the frontend codebase creates confusion about the source of truth.
- **TODOs in Code**: Missing implementations like `TODO(backend): return io(...)` in `socket.ts`.
