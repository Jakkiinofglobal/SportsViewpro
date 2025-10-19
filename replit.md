# SportSight - Multi-Sport Visualizer

## Overview
SportSight is a full-stack, monetizable SaaS platform for multi-sport play-by-play visualization with broadcast-ready HUD controls. It supports Basketball, Football, and Baseball, offering features like user authentication, subscription tiers, PayPal integration, and an admin dashboard. The platform aims to be a professional tool for sports analysis, broadcasting, and content creation, providing dynamic visuals, interactive controls, and data analytics.

## User Preferences
- Uses dark mode by default (sci-fi HUD theme)
- No backend required - runs entirely in browser
- Perfect for browser source capture in OBS/streaming software
- Responsive canvas with stable 1920×1080 logical coordinates

## System Architecture
SportSight is a full-stack application utilizing a modern web architecture.

**UI/UX Decisions:**
*   **Theme:** Professional dark sci-fi HUD theme with blue/gold accents, designed for broadcast quality.
*   **Canvas Rendering:** Pure HTML5 Canvas rendering at 1920x1080 pixels (16:9 aspect ratio) using `requestAnimationFrame` and delta-time based animations.
*   **Layout:** Features a Top Bar, Bottom Bar, a fixed-width Left Control Panel with card-based controls, and a Right Stage Area centered around the canvas.

**Technical Implementations:**
*   **Core Mechanics:** Keyboard/mouse ball control, scoreboard management, team/roster handling, possession tracking (with Shift key toggle), and game clock with speed multiplier.
*   **Sport-Specific Features:** Basketball (shot clock, free throw system, 3PT% tracking), Football (play clock, down & distance, **automatic yardage calculation from ball movement**, Pass/Rush Chart), Baseball (Ball/Strike/Out counter, runner tracking, at-bat system, HIT/STRIKE logging).
*   **Visual Enhancements:** Customizable home team logo, goal lighting effects, video clip system, and flexible camera controls.
*   **Data & Analytics:** Real-time play history logging, game stats dashboard, sport-specific shot/pass/hit chart tracking with analytics modal, and session export functionality (JSON, CSV).
*   **Input & Interaction:** Full gamepad/controller support (including RB for possession toggle), unified hotkey system for players, and two-step workflow for shot/pass/hit logging (Enter/RT/Right-click to capture → Z/Y for made, X for miss). **Canvas focus management with small top-right "Click to activate" overlay when unfocused**.
*   **Audio:** Web Audio API for sound effects with volume controls. **Soundboard integrated into session persistence with plan-based slot limits** (Demo/Studio: 3 slots, Pro+: 8 slots).
*   **Monetization & Management:** Implemented with 5 subscription tiers controlling feature access, user authentication, and an admin dashboard for user management.
*   **Persistence:** `localStorage` API for game session persistence, storing game state, settings, hotkeys, stats, history, **and soundboard data**.
*   **Sport Selection Sync:** User's selected sport from sport selection page syncs to visualizer state on mount via useEffect.

**System Design Choices:**
*   **Full-Stack Application:**
    *   **Backend (Node.js + Express):** Handles JWT-based authentication, PayPal integration, and admin APIs.
    *   **Frontend (React + TypeScript):** Utilizes Wouter for routing and TanStack Query for data fetching.

## External Dependencies
*   **Database:** PostgreSQL (Replit-hosted Neon)
*   **Payment Gateway:** PayPal
*   **Frontend Data Fetching:** TanStack Query
*   **Frontend Routing:** Wouter