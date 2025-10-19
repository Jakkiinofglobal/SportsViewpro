# SportSight - Multi-Sport Visualizer

## Overview

SportSight is a full-stack, monetizable SaaS platform designed for visualizing multi-sport play-by-play action with broadcast-ready HUD controls. It offers comprehensive sports visualization for Basketball, Football, and Baseball, featuring user authentication, subscription tiers, PayPal integration, and an admin dashboard. The platform aims to provide a professional tool for sports analysis, broadcasting, and content creation.

**Key Capabilities:**

*   **Multi-Sport Modes:** Basketball, Football, and Baseball with sport-specific rendering and controls.
*   **Interactive Controls:** Intuitive keyboard/mouse ball control, comprehensive game management, and sport-specific features (shot clock, play clock, B/S/O count).
*   **Dynamic Visuals:** Customizable home team logo, video clip system for instant replays, goal lighting effects, and flexible camera controls.
*   **Data & Analytics:** Real-time play history logging, game stats dashboard, session export functionality (JSON, CSV), player image uploads, and shot/pass/hit chart tracking.
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
*   **Layout:** Consists of a Top Bar, Bottom Bar, a fixed-width Left Control Panel for all controls in a card-based layout, and a Right Stage Area with a centered, aspect-ratio-maintained canvas.

**Technical Implementations:**

*   **Ball Movement:** Keyboard and mouse click-drag controls with visual effects and sport-specific rendering.
*   **Game Controls:** Scoreboard with correction, team/roster management, possession, and game clock with speed multiplier.
*   **Sport-Specific Features:** Basketball (shot clock), Football (play clock, down & distance), Baseball (Ball/Strike/Out counter, runner tracking).
*   **Teams & Player Hotkeys:** Unified interface for roster management, hotkey assignment, and robust validation. Includes player image uploads for higher tiers.
*   **Goal Lighting Effect:** Pulsing golden light effect on scoring, sport-specifically rendered.
*   **Home Logo Management:** Upload, size, position, and preset options for team logos.
*   **Video Clip System:** Upload and playback of video clips per team with standard player controls.
*   **Play History Log:** Automatic timestamped event tracking and CSV export.
*   **Sound Effects System:** Web Audio API for browser-native sounds with volume controls.
*   **Camera & Zoom Controls:** Zoom slider, pan controls, and preset camera angles.
*   **Game Stats Dashboard:** Real-time tracking of possession time, scoring runs, and scoring summary.
*   **Shot Chart Tracking:** Sport-specific tracking (basketball shots, football passes, baseball hits) with visual field representation and analytics modal.
*   **Session Management & Export:** Save/Load/New session functionality via `localStorage`, and export complete session data (JSON) or play history (CSV).
*   **Monetization System:** Implemented with 5 subscription tiers controlling access to features like sports, clips, hotkeys, export functionality, player images, and shot charts.
    *   **User Flow:** Signup (Demo plan) → Sport Selection (plan-gated) → Main App → Upgrade via PayPal.
    *   **Admin Dashboard:** Allows viewing and managing users (plan changes, banning, free months).

**System Design Choices:**

*   **Full-Stack Application:**
    *   **Backend (Node.js + Express):** Handles JWT-based authentication, PayPal integration, admin APIs, and RESTful API design.
    *   **Frontend (React + TypeScript):** Uses Wouter for routing, TanStack Query for data fetching, and CSS3 for styling.
*   **Persistence:** `localStorage` API for game session persistence, storing all game state, settings, hotkeys, stats, and history.

## External Dependencies

*   **Database:** PostgreSQL (Replit-hosted Neon)
*   **Payment Gateway:** PayPal
*   **Frontend Data Fetching:** TanStack Query
*   **Frontend Routing:** Wouter

## Recent Updates (Oct 19, 2025)

### Gamepad/Controller Support
- **Full Controller Integration**: Native support for Xbox, PlayStation, and compatible USB/Bluetooth gamepads using Gamepad API
- **Auto-Detection**: Controllers automatically detected on connection with toast notifications and visual indicator
- **Movement Controls**:
  - Left analog stick: Smooth 360° ball movement with 0.15 deadzone
  - D-Pad: Precise directional ball movement
  - RT/R2 trigger: Sprint modifier (2x ball speed)
- **Sport-Specific Actions**:
  - **Basketball**: Y/RT = Made shot (auto-scores), X = Missed shot, A = Free Throw mode
  - **Football**: Y/RT = Rush play, X = Pass play (uses current yardage counter)
  - Keyboard +/- still required for football yardage adjustment
- **Game Management**:
  - LT/L2 = +1 point to possession team
  - B = Cycle through ball carriers
  - LB/RB = Adjust scores ±1
  - Start = Toggle game clock
  - Select/Back = Switch possession
- **UI Enhancements**:
  - Green pulsing indicator in bottom hints bar when controller connected
  - Dynamic instruction card appears in left panel showing sport-specific button mappings
  - Card highlights with green theme when controller is active
- **Compatibility**: Works alongside keyboard and mouse controls seamlessly
- **Technical Implementation**: 60fps polling loop using `requestAnimationFrame`, edge detection for button presses vs holds

### Team Loading & Hotkey Management Improvements
- **Flexible CSV Format**: New comma-separated format for loading entire rosters at once
  - Format: `Name,#number,hotkey` (e.g., `Jaylin Williams,#6,k`)
  - Optional hotkeys: `Name,#number` loads player without hotkey
  - Backward compatible with old format
- **Hotkey Limit Fix**: Plan limits now only count players WITH hotkeys assigned (not entire roster)
- **Organized Hotkey Display**: Active hotkeys now divided into Home Team and Away Team sections
  - Each team section shows team name header
  - Player image upload buttons for each player (Creator/Pro plans)
- **Clear Ball Carrier Button**: Added button to remove current ball carrier label from canvas
  - Appears only when a carrier is active
  - Sport-specific text (Ball Carrier vs At-Bat)
- **Clear Team Enhancement**: Clearing a team now also clears ball carrier and base runners if they belong to that team

## Previous Updates (Oct 19, 2025)

### Basketball Hoop Refinements & Player Label Scaling
- **Hoop Positioning**: Orange hoops positioned at x=230 and x=1690, perfectly aligned with court image backboards
  - Reduced hoop radius from 25px to 20px for more accurate court image alignment
  - Removed white backboards (rim-only rendering)
  - Removed net lines for cleaner visual
  - Removed blue circle border around player images
  - Applied to both main canvas and Shot Chart modal
- **Player Label Scale Controls**: New UI controls for customizing player name and image display
  - **Name Text Size slider**: Range 0.5x - 2.0x (default 1.0x) - scales font size from 8px to 32px
  - **Player Image Size slider**: Range 0.5x - 2.0x (default 1.0x) - scales image from 40px to 160px (base size doubled to 80px)
  - Located in "Player Label" card in left control panel after "Ball Controls"
  - All label dimensions (height, width, positioning) scale proportionally
  - Settings persist in localStorage with proper defaults
  - New GameState properties: `playerLabelScale`, `playerImageScale`

### Basketball Advanced Stats Tracking (3PT% & FT%)
- **Free Throw System**: Press **SPACE BAR** before taking a shot to mark it as a free throw (worth 1 point)
  - Toast notification confirms "Free Throw Mode" activation
  - FT shots automatically tracked separately in Shot Chart
- **Shot Chart Statistics**: Enhanced stats display with three separate shooting percentages
  - **FG%**: Field Goal percentage (all non-free throw shots)
  - **3PT%**: Three-point percentage (shots beyond 3-point line at 380px from hoop)
  - **FT%**: Free Throw percentage (shots marked with SPACE BAR)
  - Example: `FG: 8/12 (67%) | 3PT: 3/7 (43%) | FT: 4/5 (80%)`
- **Shot Data Structure**: Extended `ShotEvent` interface with `isFreeThrow` and `points` properties
- **UI Reminders**: Bottom hints bar shows "Right-Click Ball: Log Stat | SPACE before shot: Mark as Free Throw"

### Basketball Court Visual Enhancement
- **Realistic Court Image**: Integrated professional basketball court image for both main canvas and Shot Chart modal
  - Replaced gradient background with actual court texture showing wood floor and white line markings
  - Image asset: `attached_assets/NBA-Court-Color_1760845084027.png`
  - Canvas rendering uses `ctx.drawImage()` with fallback to gradient if image not loaded
  - Shot Chart modal uses SVG `<image>` element for consistent appearance
- **Three-Point Line Fix**: Corrected SVG arc sweep direction in Shot Chart so three-point lines curve toward center of court (not behind goals)

### Football Yardage Tracking System
- **Unified Two-Step Interaction Model**: Consistent workflow across Basketball and Football
  - **Step 1**: Adjust yardage with **+/-** keys (optional, independent of logging)
  - **Step 2**: Right-click ball → Press **Z** for Rush or **X** for Pass
  - Basketball uses same pattern: Right-click ball → **Z** for made shot, **X** for missed
- **Football Yardage Controls**:
  - Press **+ (Plus)** to add 5 yards to current play
  - Press **- (Minus)** to subtract 1 yard from current play
  - Works independently - can adjust yards anytime, not just after right-click
  - Counter resets to 0 after logging each play
- **Current Play Card**: Visual display in Football mode showing real-time yards counter with color coding
  - Green text for positive yardage
  - Red text for negative yardage
  - Updates live as +/- keys are pressed
- **Pass/Rush Chart Modal**: Redesigned to display table-based analytics
  - Two stat cards: Rushing stats (plays, total yards, avg) and Passing stats (plays, total yards, avg)
  - Sortable table showing play type (Rush/Pass), player, yards, and timestamp
  - Color-coded badges: Blue for Rush, Green for Pass
  - Yards column color-coded: Green for gains, Red for losses
  - Team and player filtering with dropdown selectors
- **Data Structure**: New `FootballPlay` interface with type (rush/pass), yards, player info, team, and timestamp
- **Data Persistence**: `footballPlays` array stored in localStorage with auto-save every 1 second
- **Keyboard Blocking**: Z, X, +, -, _, = keys blocked from player hotkey assignment to prevent conflicts
- **Technical Fix**: Resolved stale closure bug by using refs (`waitingForShotResultRef`, `currentPlayYardsRef`) with `useEffect` sync instead of direct state access in event handlers

## Previous Updates (Oct 18, 2025)

### Shot Chart Redesign with Enter Key Tracking
- **New Interaction Model**: Changed from left/right-click (conflicted with Windows screenshot tool) to Enter key system
  - Click canvas to set shot/pass/hit location
  - Press **Enter** for made/completed shots (green markers)
  - Press **Shift+Enter** for missed/incomplete shots (red markers)
- **Visual Feedback**: Pulsing blue crosshair shows pending shot location on canvas
- **Chart Modal Enhancements**:
  - Two-dropdown filter system: Team selector (Home/Away) + Player selector (All Players or individual)
  - Stats bar displays FG%, Comp%, and detailed breakdown next to filters
  - Court/field visuals match actual game dimensions from canvas rendering
  - Accumulated shots displayed on realistic field layouts
- **Data Persistence**: All shot/pass/hit data stored in localStorage arrays (basketballShots, footballPasses, baseballHits)
- **Plan Gating**: Shot charts restricted to Plus Monthly, Creator Yearly, and Pro One-Time plans