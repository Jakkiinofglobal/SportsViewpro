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