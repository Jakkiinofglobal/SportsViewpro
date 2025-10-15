# Multi-Sport Visualizer

A professional client-side web application for visualizing multi-sport play-by-play action with broadcast-ready HUD controls. Built for use as a browser source in streaming/recording software.

## Overview

This is a pure client-side application (no backend) that provides a comprehensive sports visualization system for Basketball, Football, and Baseball. It features:

- **Three Complete Sport Modes**: Basketball, Football, Baseball with sport-specific field/court rendering
- **Interactive Ball Control**: Keyboard arrows and mouse click-drag for smooth ball movement
- **Comprehensive Game Management**: Live clocks, scores, possession, team rosters, and ball carrier tracking
- **Sport-Specific Features**:
  - Basketball: 24-second shot clock with reset and 14-second options
  - Football: Play clock, quarter controls, down & distance tracking
  - Baseball: Ball/Strike/Out counter with automatic inning progression and runner tracking
- **Home Team Logo**: Upload, resize, drag-and-drop positioning with presets
- **Full Session Persistence**: Save/Load/New session management via localStorage
- **Dark Sci-Fi HUD Theme**: Professional broadcast-quality interface with blue/gold accents

## Architecture

### Frontend Only (No Backend)
- Pure HTML5 Canvas for rendering (1920×1080 logical size)
- Vanilla JavaScript/TypeScript with React
- CSS3 for dark sci-fi HUD styling
- LocalStorage API for all persistence
- FileReader API for logo upload

### Key Files
- `client/src/pages/visualizer.tsx` - Main visualizer component with all game logic
- `client/src/index.css` - Dark sci-fi theme with custom animations
- `client/index.html` - App entry with proper fonts and meta tags
- `design_guidelines.md` - Complete design system documentation

### Canvas Rendering
- Logical size: 1920×1080 pixels
- Responsive with 16:9 aspect ratio maintained via CSS
- No zoom/jitter - smooth rendering via requestAnimationFrame
- Delta-time based animations for consistent speed

## Features

### Sport Switching
- Toggle between Basketball 🏀, Football 🏈, Baseball ⚾
- Automatic field/court redraw
- Sport-specific timer controls
- Default logo positioning per sport

### Ball Movement
- **Keyboard**: Arrow keys to move, Shift for sprint, Space for pulse ring
- **Mouse**: Click-drag for precise positioning anywhere on field
- **Visual Effects**: Optional trail, pulse ring animation
- **Sport-Specific Rendering**:
  - Basketball: Orange ball with seams
  - Football: Brown ellipse with laces, rotates with movement
  - Baseball: White ball with red stitching
- **Carrier Label**: Shows jersey number below ball when set

### Game Controls
- **Scoreboard**: Home/Away scores with +1/+2/+3 buttons (Baseball uses +1 only)
- **Teams**: Name input, roster management (comma-separated jersey numbers)
- **Possession**: Toggle with automatic clock resets on change
- **Game Clock**: Start/Stop/Reset with speed multiplier (×0.75/×1.00/×1.25/×1.50)

### Basketball Controls
- 24-second shot clock
- "24 → 14" reset button
- "Reset 24" button
- Auto-reset on possession change

### Football Controls
- 40-second play clock with "Reset 40" and "Delay +5s"
- Quarter controls (Q−/Q+)
- Down controls (1st through 4th)
- To-Go yards (±5 buttons)
- Auto-reset play clock on possession change

### Baseball Controls
- Ball/Strike/Out counter with dedicated buttons
- Automatic 3-out logic: resets count, clears bases, flips Top↔Bottom
- After Bottom inning: increments inning number
- Runner tracking on 1st, 2nd, 3rd base
- Advance buttons (1B/2B/3B) with automatic run scoring
- Clear bases button

### Team & Roster Management
- Separate Home/Away team inputs
- Roster entry via comma-separated jersey numbers
- Save/Load team data to localStorage (keys: msv:home, msv:away)
- Dropdown to select ball carrier/at-bat from combined roster
- "Make Ball Carrier/At-Bat" button to assign

### Home Logo Management
- **Upload**: PNG/JPG file input
- **Size**: Slider control (10-100% scale)
- **Position**: 
  - Drag mode toggle for manual positioning
  - Presets: Auto (sport-default), TL, TR, Center, BL, BR
  - Default position only applied if user hasn't positioned logo yet
- **Persistence**: Logo position and scale saved in session (image file must be re-uploaded)

### Session Management
- **Save Session**: Stores complete game state to localStorage (key: msv:session)
  - Sport, clock states, speeds
  - Team names, rosters, scores, possession
  - Basketball shot clock
  - Football quarter/down/to-go
  - Baseball inning/half, B/S/O, runners
  - Ball position, trail setting
  - Logo position and scale
- **Load Session**: Restores all saved state
- **New Session**: Clears session and refreshes page

## HUD Layout

### Top Bar (Overlay)
- Sport icon (🏀/🏈/⚾)
- Live LED indicator with pulse animation
- Period/Quarter/Inning display
- Game clock (MM:SS format)
- Sport-specific timer chip:
  - Basketball: Shot clock (24.0s)
  - Football: Down & distance (1st & 10)
  - Baseball: Count (B-S O OUT)

### Bottom Bar
- Keyboard/mouse control hints

### Left Control Panel (320px fixed width)
- Scrollable sections for all controls
- Organized cards: Sport Switch, Teams, Scoreboard, Clocks, Sport Details, Logo, Session
- Dark sci-fi styling with blue/gold accents

### Right Stage Area
- Flex-grow container with centered 16:9 canvas
- Canvas wrapper maintains aspect ratio
- Max-width constraint for optimal viewing

## Persistence Keys

LocalStorage keys used:
- `msv:home` - Home team (name + roster)
- `msv:away` - Away team (name + roster)  
- `msv:session` - Full session state (all game data except logo image file)

## User Preferences

- Uses dark mode by default (sci-fi HUD theme)
- No backend required - runs entirely in browser
- Perfect for browser source capture in OBS/streaming software
- Responsive canvas with stable 1920×1080 logical coordinates

## Recent Changes

- 2025-10-15: Initial implementation with all three sport modes
- Complete game management system with persistence
- Professional dark sci-fi HUD design with animations
- Full keyboard and mouse controls for ball movement
- Logo upload and positioning system
- Session save/load functionality
