# SportSight - Multi-Sport Visualizer

## Overview

SportSight is a full-stack, monetizable SaaS platform designed for visualizing multi-sport play-by-play action with broadcast-ready HUD controls. It offers comprehensive sports visualization for Basketball, Football, and Baseball, featuring user authentication, subscription tiers, PayPal integration, and an admin dashboard. The platform aims to provide a professional tool for sports analysis, broadcasting, and content creation.

**Key Capabilities:**

*   **Multi-Sport Modes:** Basketball, Football, and Baseball with sport-specific rendering and controls.
*   **Interactive Controls:** Intuitive keyboard/mouse ball control, comprehensive game management (clocks, scores, possession, rosters), and sport-specific features (shot clock, play clock, B/S/O count).
*   **Dynamic Visuals:** Customizable home team logo, video clip system for instant replays, goal lighting effects, and flexible camera controls (zoom, pan, presets).
*   **Data & Analytics:** Real-time play history logging, game stats dashboard (possession time, scoring runs), and session export functionality (JSON, CSV).
*   **Professional Interface:** Dark sci-fi HUD theme designed for broadcast quality, with sound effects.
*   **Full-Stack Functionality:** User authentication, subscription management, and persistence for game sessions.

## User Preferences

- Uses dark mode by default (sci-fi HUD theme)
- No backend required - runs entirely in browser
- Perfect for browser source capture in OBS/streaming software
- Responsive canvas with stable 1920×1080 logical coordinates

## System Architecture

SportSight is a full-stack application leveraging a modern web architecture.

**UI/UX Decisions:**

*   **Theme:** Professional dark sci-fi HUD theme with blue/gold accents for a broadcast-quality interface.
*   **Canvas Rendering:** Pure HTML5 Canvas rendering at a logical size of 1920x1080 pixels, maintaining a 16:9 aspect ratio via CSS. Utilizes `requestAnimationFrame` and delta-time based animations for smooth, consistent rendering.
*   **Layout:**
    *   **Top Bar:** Overlay for sport icon, live LED indicator, period/quarter/inning display, game clock, and sport-specific timers.
    *   **Bottom Bar:** Control hints.
    *   **Left Control Panel (320px fixed width):** Scrollable, organized sections for all controls (Sport Switch, Teams & Player Hotkeys, Video Clips, Scoreboard, Ball Controls, Camera & Zoom, Session management, etc.) in a card-based layout for optimized workflow.
    *   **Right Stage Area:** Flex-grow container with a centered, aspect-ratio-maintained canvas.

**Technical Implementations:**

*   **Ball Movement:** Keyboard (arrows, Shift for sprint, Space for pulse) and mouse click-drag controls. Features visual effects (trail, pulse ring) and sport-specific rendering (basketball, football, baseball).
*   **Game Controls:** Scoreboard with correction buttons, team name input, roster management, possession toggle, and game clock with speed multiplier.
*   **Sport-Specific Features:**
    *   **Basketball:** 24-second shot clock with reset options.
    *   **Football:** 40-second play clock, quarter controls, down & distance tracking.
    *   **Baseball:** Ball/Strike/Out counter, automatic inning progression, and runner tracking.
*   **Teams & Player Hotkeys:** Unified interface for roster management and hotkey assignment (`Name #number, hotkey`). Supports separate home/away management, quick switching, active hotkeys display, and robust validation.
*   **Score Hotkeys:** Keyboard shortcuts assignable to all scoring buttons, with visual indicators.
*   **Goal Lighting Effect:** Pulsing golden light effect (800ms) triggered on scoring, sport-specifically rendered (hoop, endzone, home plate).
*   **Home Logo Management:** Upload (PNG/JPG), size slider, manual drag/drop positioning, and preset options.
*   **Video Clip System:** Upload and playback of 5 video clips per team (MP4, WebM, MOV) with standard player controls in a modal.
*   **Play History Log:** Automatic timestamped event tracking (score, possession, period changes), scrollable display, and CSV export.
*   **Sound Effects System:** Web Audio API for browser-native scoring sounds, possession chimes, and clock warnings, with volume controls.
*   **Camera & Zoom Controls:** 0.5x-3.0x zoom slider, pan controls (arrow buttons), and preset camera angles (Center, Wide, Goal, Action).
*   **Game Stats Dashboard:** Real-time tracking of possession time, scoring runs, and a scoring summary.
*   **Session Management & Export:** Save/Load/New session functionality via `localStorage`, and export complete session data (JSON) or play history (CSV).

**System Design Choices:**

*   **Full-Stack Application:**
    *   **Backend (Node.js + Express):** Handles JWT-based authentication with HTTP-only cookies, PayPal integration for subscriptions, admin APIs for user management, and RESTful API design.
    *   **Frontend (React + TypeScript):** Uses Wouter for routing, TanStack Query for data fetching, and CSS3 for styling.
*   **Persistence:** LocalStorage API for game session persistence, storing all game state, settings, hotkeys, stats, and history.

## External Dependencies

*   **Database:** PostgreSQL (Replit-hosted Neon)
*   **Payment Gateway:** PayPal
*   **Frontend Data Fetching:** TanStack Query
*   **Frontend Routing:** Wouter
## Monetization System

### Subscription Tiers

SportSight offers 5 pricing tiers with feature-based access control:

| Plan ID | Name | Price | Sports | Clips | Hotkeys | Export |
|---------|------|-------|--------|-------|---------|--------|
| `demo` | Demo (Free) | $0 | 1 sport | 1 total | 1H + 1A (points +2/+3 only) | No |
| `studioMonthly` | Studio Monthly | $28.99/mo | 1 sport | 2 (1 home, 1 away) | 5H + 5A (all points) | Basic |
| `plusMonthly` | Plus Monthly (Pro) | $39.99/mo | All sports | 10 clips | 10H + 10A (all points) | Full |
| `creatorYearly` | Creator Yearly | $198.97/yr | All sports | 10 clips | 10H + 10A (all points) | Full |
| `proOneTime` | SportSight Pro Studio | $349.99 one-time | All sports | 10 clips | 10H + 10A (all points) | Full |

### User Flow

1. **Signup**: User creates account (email + password) → Auto-assigned to Demo plan
2. **Sport Selection**: User chooses their sport
   - Demo/Studio users: Must pick ONE sport (locked)
   - Plus/Creator/Pro users: Can switch sports anytime
3. **Main App**: Access visualizer with features based on plan
4. **Upgrade**: Click locked features → Upgrade modal → PayPal checkout

### Admin Dashboard

**Access:** Navigate to `/admin` (requires admin privileges)

**Features:**
- View all users with email, plan, sport, and subscription status
- Change user plans (dropdown selector)
- Ban users (with reason tracking)
- Grant free months (with reason logging)
- View all admin actions per user

**Creating First Admin:**
```sql
-- Connect to your PostgreSQL database and run:
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### PayPal Integration

**Setup (Required for payments):**
1. Get PayPal Business account
2. Go to https://developer.paypal.com/dashboard/
3. Create app under "REST API apps"
4. Add credentials to Replit Secrets:
   - `PAYPAL_CLIENT_ID` - Your PayPal Client ID
   - `PAYPAL_CLIENT_SECRET` - Your PayPal Secret
5. Use **Sandbox** for testing, **Live** for production

**Payment Flow:**
1. User clicks upgrade → Selects plan
2. PayPal button appears with plan price
3. User completes payment via PayPal
4. Backend receives webhook → Updates user plan
5. User gets instant access to new features

### API Endpoints

**Authentication:**
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (clears cookie)
- `GET /api/auth/session` - Get current user

**Sport Selection:**
- `POST /api/select-sport` - Set user's sport (validates plan restrictions)

**PayPal:**
- `GET /paypal/setup` - Get PayPal client token
- `POST /paypal/order` - Create PayPal order
- `POST /paypal/order/:orderID/capture` - Capture completed payment
- `POST /api/payment/success` - Update user plan after payment

**Admin (requires admin auth):**
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users/:userId/plan` - Change user plan
- `POST /api/admin/users/:userId/ban` - Ban user
- `POST /api/admin/users/:userId/free-months` - Grant free months
- `GET /api/admin/users/:userId/actions` - View admin action history

### Database Schema

**Users Table:**
- `id` - UUID primary key
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `plan` - Current subscription plan (default: 'demo')
- `selectedSport` - Chosen sport (basketball/football/baseball)
- `purchasedSport` - Sport locked at purchase (for single-sport plans)
- `subscriptionId` - PayPal subscription ID
- `subscriptionStatus` - active/banned/etc
- `isAdmin` - Admin flag
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

**Transactions Table:**
- Records all payment transactions
- Links to user via `userId`
- Stores PayPal order/subscription IDs
- Tracks amount, currency, status

**Admin Actions Table:**
- Logs all admin interventions
- Tracks which admin performed action
- Records action type and details
- Timestamped audit trail

## Recent Changes

### 2025-10-18: Shot Chart & Analytics System
- **Shot Chart Tracking**:
  - Basketball: Left-click records shots (green=make, red=miss) with player attribution
  - Football: Pass distance tracker with line visualization showing throw trajectory
  - Baseball: Hit spray chart with color-coded hit types (single/double/triple/HR)
- **Chart Modal**:
  - Comprehensive analytics modal with sport-specific tabs
  - Real-time statistics (shooting %, pass completion, hit distribution)
  - Visual field representation with all tracked events
  - Clear chart functionality to reset tracking data
- **Plan Gating**:
  - Chart access restricted to Plus Monthly, Creator Yearly, and Pro One-Time plans
  - Demo and Studio users see upgrade prompts with lock icons
  - Integrated with existing `usePlanLimits` hook
- **Chart Buttons**:
  - Basketball: "Shot Chart" button in shot clock section
  - Football: "Pass Chart" button in play clock section
  - Baseball: "Hit Chart" button in inning controls section
- **Data Storage**: All tracking data persists in localStorage with backward compatibility

### 2025-10-18: Complete Feature Gating System
- **Upgrade Modal Component**: 
  - PayPal integration with all 5 pricing tiers
  - Automatic modal trigger when users hit plan limits
  - Professional pricing cards with feature comparisons
- **Plan Limits Hook** (`usePlanLimits`):
  - Real-time plan validation based on user subscription
  - Centralized feature access control logic
  - Toast notifications for locked features
- **Sport Switching**: 
  - Demo/Studio users locked to selected sport
  - Plus/Creator/Pro users can switch anytime
  - Toast notification on restriction
- **Video Clip Limits**:
  - Demo: 1 clip total (across both teams)
  - Studio: 2 clips (1 home, 1 away)
  - Plus/Creator/Pro: 10 clips total
  - Lock icons on upload buttons when at limit
- **Player Hotkey Limits**:
  - Demo: 1 hotkey per team (2 total)
  - Studio: 5 hotkeys per team (10 total)
  - Plus/Creator/Pro: 10 hotkeys per team (20 total)
  - Validation on roster loading with error messages
- **Score Hotkey Restrictions**:
  - Demo: Only +2 and +3 hotkeys allowed (no +1)
  - All other plans: All score hotkeys (+1, +2, +3)
  - Disabled inputs with lock icons for restricted buttons
- **Export Functionality**:
  - Demo: No export allowed
  - Studio: Basic export (CSV history)
  - Plus/Creator/Pro: Full export (JSON session + CSV history)
  - Export buttons disabled with upgrade prompts
- **Testing**: Complete e2e test suite verified all feature restrictions

### 2025-10-18: Complete Backend Monetization System
- **PostgreSQL Database**: Users, transactions, admin actions tables
- **JWT Authentication**: Secure HTTP-only cookie-based auth system
- **PayPal Integration**: Complete payment processing with 5 pricing tiers
- **Admin Dashboard**: 
  - View all users and subscription details
  - Change user plans with reason tracking
  - Ban/unban users with audit logging
  - Grant free months feature
- **Frontend Pages**:
  - Login/Signup pages with validation
  - Sport selection with plan-based restrictions
  - Protected routes requiring authentication
  - Admin dashboard at `/admin`
- **API Routes**: RESTful backend with auth middleware

### 2025-10-16: Score Correction & Quarter Fix
- Score correction buttons (-1) for both home and away teams
- Fixed NaN display in quarter/period when loading older sessions

### 2025-10-16: Unified Teams & Player Hotkeys
- Consolidated Teams, Player Hotkeys, Ball Carrier into single card
- Score hotkeys for all scoring buttons
- Goal lighting effect on scoring

### 2025-10-16: Advanced Features
- Video clip system (5 per team)
- Play history log with CSV export
- Sound effects system with Web Audio API
- Camera controls with zoom and presets
- Game stats dashboard

## Deployment Notes

**Current Setup:**
- Backend: Runs on Replit (port 5000)
- Database: PostgreSQL (Replit-hosted Neon)
- Frontend: Can be deployed to Vercel/Netlify
- PayPal: Sandbox for testing, Live for production

**Production Checklist:**
1. ✅ Add PayPal Live credentials (replace Sandbox)
2. ✅ Create first admin user via SQL
3. ✅ Test complete signup → payment → access flow
4. ✅ Set up proper CORS for production domain
5. ✅ Enable HTTPS (required for cookies in production)

**Security Notes:**
- JWT tokens stored in HTTP-only cookies (prevents XSS)
- Passwords hashed with bcrypt (10 rounds)
- Admin routes protected by middleware
- CORS configured for frontend domain

