# Step Ritual - Design Guidelines

## Brand Identity

**Purpose**: Couples track walks together, building shared fitness rituals and celebrating daily movement as a team.

**Aesthetic Direction**: Retro-futuristic nostalgia - bold 80s neon energy meets modern relationship-building. Think Miami Vice meets modern wellness apps. High contrast, energetic, playful but sophisticated. The neon colors pop dramatically against the soft cream background, creating visual excitement without overwhelming.

**Memorable Element**: Neon glow effects on active states and achievement moments. The electric cyan (#00E5FF) should feel like it's pulsing with energy when tracking is active.

## Navigation Architecture

**Root Navigation**: Tab Navigation (4 tabs)
- Today (home icon) - Daily walk tracking
- Stats (chart icon) - Progress and history
- Rituals (heart icon) - Shared achievements
- Profile (person icon) - Settings and partner connection

**Authentication**: Required
- Use Apple Sign-In (iOS) and Google Sign-In
- Onboarding flow: Sign In → Partner Connection Code → Set Daily Goal → Home
- Profile includes partner management and sign out

**Screen List**:
1. Onboarding/Login (stack-only, before tabs)
2. Partner Connect (modal after first login)
3. Today (tab 1) - Active walk tracking
4. Stats (tab 2) - Charts and progress
5. Rituals (tab 3) - Milestones and achievements
6. Profile (tab 4) - Settings and account
7. Walk Detail (modal) - Individual walk history

## Screen-by-Screen Specifications

### 1. Login Screen
- **Layout**: Stack-only, full screen
- **Header**: None
- **Content**: 
  - Top: App icon and "Step Ritual" wordmark (Creamy Sand on gradient Midnight Indigo → Electric Cyan background)
  - Center: SSO buttons (Apple, Google) with rounded corners (16px radius)
  - Bottom: Terms/Privacy links in small text
- **Safe Area**: Standard insets all sides

### 2. Partner Connect (Modal)
- **Layout**: Modal card with rounded top corners (24px radius)
- **Header**: "Connect with Partner" title, X close button (top-right)
- **Content**:
  - Segmented control: "Share Code" / "Enter Code"
  - Large 6-digit code display (Electric Cyan glow when active)
  - Explanatory text: "Share this code with your partner"
  - Primary button: "Continue" (disabled until partner connects)
- **Safe Area**: Top: insets.top + Spacing.xl, Bottom: insets.bottom + Spacing.xl

### 3. Today Tab (Home)
- **Layout**: Scrollable
- **Header**: Transparent, partner avatars (left), notification bell (right)
- **Content**:
  - Hero card (soft rounded 20px, drop shadow on Creamy Sand background):
    - Large step count (both partners side-by-side, color-coded by avatar)
    - Distance and duration below
    - "Start Walk" button (Electric Cyan, 50% width, centered, floating above card)
  - Daily goal progress bar (Lavender Pop fill, Electric Cyan when complete)
  - Recent walk cards (list, 16px rounded, show date/time/steps/distance)
- **Empty State**: When no walks today, show "first-walk.png" illustration
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 4. Stats Tab
- **Layout**: Scrollable
- **Header**: Default navigation header, "Stats" title, filter icon (right)
- **Content**:
  - Time range segmented control: Week / Month / Year
  - Bar chart card (Lemon Glow bars for user, Lavender Pop for partner, Electric Cyan for shared walks)
  - Stat cards grid (2 columns):
    - Total walks
    - Total distance
    - Longest streak
    - Average steps
- **Empty State**: "empty-stats.png" when no data
- **Safe Area**: Top: Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 5. Rituals Tab
- **Layout**: Scrollable list
- **Header**: Default navigation header, "Rituals" title
- **Content**:
  - Achievement cards (full-width, 20px rounded):
    - Icon (left), title/description, date earned
    - Neon glow effect on Electric Cyan border for recent achievements
  - Categories: Streaks, Milestones, Challenges
- **Empty State**: "empty-rituals.png" 
- **Safe Area**: Top: Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 6. Profile Tab
- **Layout**: Scrollable form
- **Header**: Transparent, "Edit" button (right when viewing own profile)
- **Content**:
  - Avatar (top center, 120px diameter)
  - Display name
  - Partner section (card with partner avatar, name, "Disconnect" option nested in Settings)
  - Settings list:
    - Daily goal (opens picker modal)
    - Notifications
    - Units (miles/km)
    - Account → Sign Out, Delete Account (nested, double confirmation)
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 7. Walk Detail (Modal)
- **Layout**: Modal, scrollable
- **Header**: Swipe-down handle, "Walk Details", X close (right)
- **Content**:
  - Date and time
  - Stats grid: Steps, Distance, Duration, Calories
  - Map placeholder (if location tracked)
  - Partner comparison (side-by-side avatars with individual stats)
- **Safe Area**: Top: insets.top + Spacing.xl, Bottom: insets.bottom + Spacing.xl

## Design System

### Color Palette
- **Primary**: Electric Cyan (#00E5FF) - buttons, active states, tracking
- **Secondary**: Lavender Pop (#B88BFF) - partner data, accents
- **Accent**: Lemon Glow (#FFE66D) - user data, highlights
- **Background**: Creamy Sand (#FFF3D6)
- **Surface**: White (#FFFFFF) - card backgrounds
- **Text Primary**: Midnight Indigo (#1A1458)
- **Text Secondary**: Midnight Indigo 60% opacity
- **Success**: Electric Cyan
- **Error**: Lavender Pop (use sparingly)

### Typography
- **Font**: "Outfit" (Google Font) - geometric, modern, perfect for 80s retro-futuristic vibe
- **Scale**:
  - H1: 34pt Bold (screen titles)
  - H2: 28pt Bold (card headers)
  - H3: 20pt Bold (section titles)
  - Body: 16pt Regular
  - Caption: 13pt Regular
  - Button: 16pt SemiBold

### Component Specifications

**Cards**: 20px rounded corners, white background, subtle drop shadow (shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.08, shadowRadius: 4)

**Buttons**: 
- Primary: Electric Cyan background, white text, 16px rounded, height 56px
- Secondary: Transparent with Electric Cyan border (2px), Electric Cyan text
- Press state: 80% opacity

**Segmented Control**: 
- Background: White, 12px rounded
- Active segment: Electric Cyan with white text
- Inactive: Midnight Indigo 60% text

**Progress Bars**: 8px height, fully rounded ends, Lavender Pop background, Electric Cyan fill

**Floating Action Button** (if needed for "Start Walk"): 
- Electric Cyan, 64px diameter, white walk icon
- Shadow: {width: 0, height: 2}, opacity: 0.10, radius: 2

## Assets to Generate

1. **icon.png** - App icon: Neon footprints (2 sets side-by-side, Electric Cyan and Lavender Pop) on Midnight Indigo gradient background

2. **splash-icon.png** - Same as app icon

3. **first-walk.png** - Empty state for Today tab: Minimalist illustration of two people holding hands silhouette against neon sunset gradient (Electric Cyan → Lavender Pop), used when no walks recorded today

4. **empty-stats.png** - Empty state for Stats tab: Simple bar chart outline with dashed lines (Lavender Pop), used when no walk history exists

5. **empty-rituals.png** - Empty state for Rituals tab: Trophy outline with neon glow effect (Electric Cyan border), used when no achievements earned

6. **avatar-default-1.png** - Preset avatar option: Abstract geometric shape in Lemon Glow, used in Profile and partner display

7. **avatar-default-2.png** - Preset avatar option: Abstract geometric shape in Lavender Pop, used in Profile and partner display