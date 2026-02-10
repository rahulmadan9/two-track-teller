# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Run tests once (vitest)
npm run test:watch   # Run tests in watch mode
```

Firebase config is loaded from `VITE_FIREBASE_*` env vars. Set `VITE_USE_FIREBASE_EMULATORS=true` to use local emulators.

## Architecture

Two-person roommate expense-splitting PWA. Single-page app with tab-based navigation (no routing beyond `/` and `/auth`).

### Data Flow

- **Auth**: Firebase Auth with phone number login (`useAuth` / `useFirebaseAuth`)
- **Real-time data**: All hooks (`useExpenses`, `useProfiles`, `useRecurringExpenses`) use Firestore `onSnapshot` listeners — no React Query for data fetching
- **Dual queries in useExpenses**: Expenses are fetched with two parallel Firestore queries (by `paidBy` and by `owesUserId`), then merged and deduplicated client-side
- **Field naming convention**: Firestore documents use camelCase (`paidBy`, `owesUserId`). App-layer interfaces use snake_case (`paid_by`, `owes_user_id`) for historical Supabase compatibility. Conversion happens in hooks.
- **Denormalized names**: User display names are stored directly in expense/recurring docs (`paidByName`, `owesUserName`) to avoid joins

### Key Modules

- `src/lib/balanceCalculation.ts` — Single source of truth for all balance math. `getExpenseContribution()` handles split types, payments, and roommate filtering. `calculateNetBalance()` and `calculateRunningBalances()` build on it.
- `src/lib/validation.ts` — Zod schemas for client-side validation. Firestore security rules (`firestore.rules`) provide server-side backup.
- `src/integrations/firebase/config.ts` — Firebase init, auth persistence, emulator connection
- `src/integrations/firebase/types.ts` — Firestore document types (camelCase)

### UI Structure

Dashboard is a tab switcher (not routes): Balance, Recurring, Add, Expenses, Profile. `BottomNav` controls active tab with a floating center "Add" button. All tab transitions use Framer Motion. UI components from Shadcn/UI (`src/components/ui/`).

### Firestore Collections

- `users` — User profiles (doc ID = Auth UID)
- `expenses` — All expenses including recurring confirmations and payments (`isPayment` flag)
- `recurringExpenses` — Templates for monthly recurring items (shared or personal)
- `recurringConfirmations` — Immutable monthly confirmation records linking back to `expenses`

### Recurring Expenses Flow

Templates in `recurringExpenses` are confirmed monthly, creating both a `recurringConfirmations` record and a corresponding `expenses` document. Confirmations are immutable once created.
