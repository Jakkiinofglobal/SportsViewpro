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
- **Video Clip System**: Upload and playback 5 video clips per team for instant replays
- **Play History Log**: Timestamped event tracking with scrollable history display
- **Sound Effects**: Web Audio API-based scoring sounds, possession chimes, with volume controls
- **Camera Controls**: Zoom (0.5x-3.0x), pan, and preset camera angles for dynamic views
- **Game Stats Dashboard**: Real-time possession time, scoring runs, and analytics
- **Export Functionality**: Download session data as JSON, play history as CSV
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

### Video Clip System
- **Upload**: 5 video clips per team (Home/Away)
- **File Support**: MP4, WebM, MOV formats
- **Playback Modal**: Click play buttons to view clips in fullscreen dialog
- **Video Controls**: Standard browser video player with play/pause/seek
- **Quick Access**: Direct playback buttons for each clip slot
- **Storage**: Video file URLs stored in session (files must be re-uploaded on reload)

### Play History Log
- **Event Tracking**: Automatic timestamped logging of:
  - Score changes (team, points, new total)
  - Possession changes
  - Period/quarter/inning changes
- **Display**: Scrollable event list with latest events at top
- **Storage**: Maintains last 100 events
- **Toggle View**: Show/Hide history panel
- **Clear Function**: Reset history to start fresh
- **Export**: Download complete history as CSV file

### Sound Effects System
- **Web Audio API**: Browser-native sound generation (no external audio files)
- **Scoring Sounds**: Different tones for 1/2/3 point scores (C5/E5/G5 frequencies)
- **Possession Sound**: Chime on possession change (A4 frequency)
- **Clock Warning**: Low tone for final seconds (A3 frequency)
- **Controls**:
  - Sound ON/OFF toggle
  - Volume slider (0-100%)
  - Real-time volume adjustment
- **Mute State**: Persists during session

### Camera & Zoom Controls
- **Zoom**: 0.5x to 3.0x magnification with slider control
- **Pan Controls**: Arrow buttons (↑↓←→) for field navigation
- **Presets**:
  - Center: Default 1.0x zoom, centered view
  - Wide: 0.8x zoom for full field overview
  - Goal/Endzone/Home: Sport-specific close-up (2.0x zoom on key areas)
  - Action: 1.5x zoom maintaining current pan position
- **Reset View**: One-click return to default camera position
- **Canvas Transform**: Applies ctx.translate/scale for smooth zoom/pan

### Game Stats Dashboard
- **Possession Time**: Live tracking of time each team holds possession
  - Updates every second when game clock is running
  - Separate counters for Home/Away teams
  - Displays in MM:SS format
- **Scoring Runs**: Tracks consecutive points by one team
  - Shows current team on run and total points
  - Resets when opposing team scores
- **Scoring Summary**:
  - Total number of scoring events per team
  - Score history tracking
- **Toggle Display**: Show/Hide stats panel
- **Real-time Updates**: Stats update live during gameplay

### Session Management & Export
- **Save Session**: Stores complete game state to localStorage (key: msv:session)
  - Sport, clock states, speeds
  - Team names, rosters, scores, possession
  - Basketball shot clock
  - Football quarter/down/to-go
  - Baseball inning/half, B/S/O, runners
  - Ball position, trail setting
  - Logo position and scale
  - Game stats (possession time, scoring data)
- **Load Session**: Restores all saved state
- **New Session**: Clears session and refreshes page
- **Export Session (JSON)**: Download complete game data with stats
  - Includes all game state, settings, and statistics
  - Timestamped filename: `game-session-{timestamp}.json`
- **Export History (CSV)**: Download play-by-play events
  - CSV format: Timestamp, Type, Description
  - Timestamped filename: `play-history-{timestamp}.csv`
  - Disabled when no history events exist

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
- Organized cards: 
  - Sport Switch, Teams, Scoreboard, Clocks
  - Sport Details (Basketball/Football/Baseball specific)
  - Video Clips (5 slots per team)
  - Carrier/At-Bat selection
  - Ball Controls, Sound Effects, Camera & Zoom
  - Logo positioning
  - Game Stats, Play History
  - Session management & Export
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

### 2025-10-16: Advanced Features Update
- **Video Clip System**: Upload and playback 5 clips per team for instant replays
- **Play History Log**: Timestamped event tracking with scrollable display and CSV export
- **Sound Effects**: Web Audio API implementation with scoring sounds, possession chimes, volume controls
- **Camera Controls**: Zoom (0.5x-3.0x), pan controls, and preset camera angles
- **Game Stats Dashboard**: Real-time possession time tracking, scoring runs, and analytics
- **Export Functionality**: JSON session export and CSV history export

### 2025-10-15: Initial Implementation
- Three complete sport modes (Basketball, Football, Baseball)
- Complete game management system with persistence
- Professional dark sci-fi HUD design with animations
- Full keyboard and mouse controls for ball movement
- Logo upload and positioning system
- Session save/load functionality
