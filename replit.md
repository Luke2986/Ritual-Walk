# Step Ritual

## Overview

Step Ritual is a mobile-first couples fitness tracking application with an 80s neon aesthetic. The app allows couples to track their walks together, share progress, and maintain streaks as a bonding ritual. Built with Expo/React Native for cross-platform mobile support and a Node.js/Express backend with PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7 with native stack and bottom tab navigators
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: Custom themed components with neon color palette, React Native Reanimated for animations
- **Path Aliases**: `@/` maps to `./client`, `@shared/` maps to `./shared`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API at `/api/*` routes
- **Authentication**: JWT tokens stored client-side in AsyncStorage, bcrypt for password hashing
- **Database Access**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Core Tables**:
  - `couples`: Linked pairs with shared stats (totalKm, currentStreak)
  - `users`: Individual accounts linked to couples via coupleId
  - `walks`: Walking sessions with GPS path data, distance, and duration

### Authentication Flow
- JWT-based authentication with tokens stored in AsyncStorage
- Auth context provides login/register/logout and couple management (create/join via ritual codes)
- Protected routes check authentication state before rendering

### Key Design Patterns
- **Shared Schema**: Database types shared between client and server via `@shared/schema`
- **Platform-Specific Components**: `.native.tsx` and `.web.tsx` suffixes for MapView
- **Theming**: Always-dark neon theme defined in `constants/theme.ts`
- **Error Handling**: ErrorBoundary component wraps the app root

### Recent Changes (January 2026)
- **Pairing System (Robust Invite Code Recovery)**:
  - Refactored Account pairing UI with 3-state machine based on DB data (not local state)
  - **UNPAIRED**: Shows BOTH "Inserisci codice" input AND "Genera Codice Invito" button
  - **PENDING_INVITER**: Shows invite code with copy/share buttons, expiry date, "In attesa del partner" status
    - **"Rigenera codice"** button: Forces regeneration of invite code
    - **"Annulla invito"** button: Archives pending invite and returns to UNPAIRED
    - Expired/invalid code shows error state with regenerate option
  - **ACTIVE**: Shows "Connesso" status with partner info and heart icon
  - **Backend Idempotent Generate**: `POST /api/couple/generate` is now fully idempotent:
    - User is UNPAIRED → creates new invite with 24h expiry
    - User is PENDING_INVITER with valid code → **returns existing code (RECOVERY)**
    - User is PENDING_INVITER with expired/null code → **auto-regenerates in place**
    - User is ACTIVE → returns 409 ALREADY_PAIRED
    - User has archived couple → cleans up and creates new invite
  - **Additional Endpoints**:
    - `POST /api/couple/regenerate`: Force regenerate invite code for pending inviter
    - `POST /api/couple/cancel-invite`: Archive pending invite and unlink user
  - **AuthContext Methods**: `regenerateInvite()` and `cancelInvite()` added
  - Backend returns `status`, `createdByUserId`, `expiresAt`, `ritualCode` in couple data
  - Invite codes are now **always recoverable** after re-login as long as pending and not expired

- **Unpair Feature**: Users can now disconnect from their partner:
  - Couples table supports `status: "archived"` with `archivedAt` and `archivedByUserId` columns
  - **POST /api/couple/unpair**: Atomic transaction that archives couple, unlinks both users, disables partner alerts
  - **"Area Pericolosa" section**: Only visible in Account screen when actively paired (couple.status === "active")
  - Confirmation dialog before unpair (web uses window.confirm, native uses Alert.alert)
  - Both users' `coupleId` is set to null, walks remain saved
  - Storia and Home screens gracefully handle unpaired state with "Collega il Partner" messaging
  - Note: Partner's client doesn't auto-update; they need to pull-to-refresh to see status change

- **Notifications System**: Full notification preferences management:
  - `notification_prefs` table with per-user settings
  - API endpoints: GET/PUT `/api/notification-prefs`
  - **NotificationsScreen**: Master switch + OS permission handling
  - **5 Categories**: Promemoria, Avvisi partner, Streak/badge, Riepilogo settimanale, Ore silenziose
  - **Sub-menu screens**: ReminderSettings, WeeklySummarySettings, QuietHoursSettings
  - Uses expo-notifications for OS permission checks
  - Uses @react-native-community/datetimepicker for time selection
  - Account screen navigates to dedicated Notifications screen

- **Progress Calendar Widget**: Added to Home screen above "Camminate recenti":
  - `ProgressCalendar`: Reusable calendar component with activity indicators
  - `CalendarDay`: Custom day cell with color-coded indicators
  - Blue bar (#00E5FF) = Io walked, Violet bar (#B88BFF) = Partner walked
  - Yellow border (#FFE66D) = Both walked together
  - Tap calendar navigates to Storia with Month view focused
  - Uses mock activity data (TODO: Connect to real walk data from API)
- **Statistics Section**: Storia (History) tab now shows ONLY statistics (removed "Camminate recenti"):
  - `TimeRangeToggle`: Segmented control for Settimana/Mese/Anno with animated indicator
  - `WeeklyDualBarChart`: Weekly dual-bar chart (7 days: Lun-Dom)
  - `MonthlyDualBarChart`: Monthly dual-bar chart (4 weeks: Sett 1-4) + full calendar
  - `YearlyDualBarChart`: Yearly dual-bar chart (12 months: Gen-Dic)
  - All charts show Io (Electric Cyan #00E5FF) vs Partner (Lavender Pop #B88BFF)
  - `formatDistance`: Helper function that displays values < 1km in meters
  - Navigation params: `{ focus: "stats", range: "week" | "month" | "year" }`
- **Camminate Recenti**: Visible ONLY in Home tab (DashboardScreen)
- **Chart Library**: react-native-gifted-charts for bar chart visualization
- **Calendar Library**: react-native-calendars for monthly calendar view

- **Track/Camminata Screen Redesign**: Complete UX overhaul with step counting:
  - **Step Counting**: Uses expo-sensors Pedometer API instead of GPS for indoor/outdoor accuracy
  - **States**: Idle → Running → (Optional: Locked) → Summary → Idle
  - **Idle State**: Hero icon with "Pronto per il rituale?" message and "Inizia" button
  - **Running State**: 
    - `WalkKpiRow`: 3 KPI cards (Passi, Distanza, Tempo) with neon styling
    - Lock toggle button for pocket mode protection
    - `HoldToStopButton`: 2-second hold-to-stop button (prevents accidental stops)
  - **Pocket Lock**: `PocketLockOverlay` with 2-second long-press unlock gesture
  - **Summary**: `WalkSummarySheet` modal with walk stats and "Salva nel Diario" button
  - **Database**: Added `stepsTotal` field to walks table for step count persistence
  - **Distance Estimation**: STEP_LENGTH_KM = 0.0007 (70cm per step)
  - **Platform-Specific**: HoldToStopButton uses native DOM events on web for testing compatibility
  - **TestIDs**: button-start-session, button-hold-to-stop, button-toggle-lock, button-save-walk

## External Dependencies

### Database
- PostgreSQL database connected via `DATABASE_URL` environment variable
- Drizzle Kit for schema migrations (`npm run db:push`)

### Third-Party Services
- **Expo Location**: GPS tracking for walks
- **Expo Haptics**: Tactile feedback on user interactions
- **React Native Maps**: Map display for walk tracking and history (native only)

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: JWT signing secret (falls back to default in development)
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for CORS configuration