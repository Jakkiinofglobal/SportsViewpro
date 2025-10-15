# Multi-Sport Visualizer Design Guidelines

## Design Approach
**Selected Approach:** Design System (Utility-Focused) with Custom Sci-Fi HUD Aesthetic

This is a professional broadcast tool requiring clarity, instant readability, and precise control. The design prioritizes function while delivering a polished, modern sports broadcast aesthetic with dark sci-fi HUD styling.

## Core Design Elements

### A. Color Palette

**Dark Mode Base:**
- Background Primary: `220 15% 8%` (deep charcoal with blue undertone)
- Background Secondary: `220 12% 12%` (panel backgrounds)
- Background Tertiary: `220 10% 16%` (elevated sections, cards)

**Accent Colors:**
- Primary (Cyber Blue): `210 100% 55%` (interactive elements, active states)
- Gold Accent: `45 95% 60%` (highlights, important status indicators)
- Success Green: `142 76% 45%` (live indicators, positive actions)
- Warning Orange: `25 95% 58%` (alerts, time running out)
- Danger Red: `0 84% 60%` (critical states)

**Sport-Specific Accents:**
- Basketball: `25 95% 60%` (orange)
- Football: `142 76% 45%` (field green) 
- Baseball: `0 0% 95%` (white with red stitching accents)

**Text Colors:**
- Primary Text: `0 0% 95%` (high contrast white)
- Secondary Text: `220 10% 70%` (medium gray)
- Tertiary Text: `220 8% 50%` (subtle labels)

### B. Typography

**Font Families:**
- Primary: 'Inter' via Google Fonts (UI, controls, data)
- Monospace: 'JetBrains Mono' (timers, scores, stats)
- Display: 'Rajdhani' (sport titles, big numbers)

**Type Scale:**
- Hero Numbers (Scores): 3.5rem / 700 / Rajdhani
- Timer Display: 2rem / 500 / JetBrains Mono
- Section Headers: 1.125rem / 600 / Inter
- Body Text: 0.875rem / 400 / Inter
- Labels/Captions: 0.75rem / 500 / Inter uppercase with letter-spacing

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 8, 12, 16 for consistent rhythm
- Micro spacing (buttons, chips): p-2, gap-2
- Component padding: p-4, p-6
- Section spacing: p-8, gap-8
- Panel margins: p-12, p-16

**Grid Structure:**
- Left Control Panel: Fixed 320px width with overflow-y scroll
- Right Stage Area: Flex-grow with 16:9 aspect ratio canvas container
- HUD Overlay: Absolute positioned chips with backdrop-blur

### D. Component Library

**Control Panel Components:**
- Section Cards: `bg-[220 12% 12%]` with 1px border `220 20% 24%`, rounded-lg
- Input Fields: Dark inputs `bg-[220 10% 10%]` with cyan focus ring, h-10
- Buttons Primary: `bg-[210 100% 55%]` with hover lift effect
- Buttons Secondary: Outline style with `border-[220 20% 24%]`
- Toggle Buttons: Grid layout, active state gets primary bg + gold border-top
- Sliders: Custom styled with cyber blue track and gold thumb

**HUD Overlay Chips:**
- Semi-transparent panels: `bg-[220 15% 8%]/90` with backdrop-blur-md
- Border accent: 1px solid gold `45 95% 60%` on active/live elements
- Rounded corners: rounded-full for status chips, rounded-lg for data panels
- Shadow: Subtle glow effects using box-shadow with cyan/gold

**Data Display:**
- Scoreboard: Large monospace numbers with team name above
- Possession Indicator: Animated pulse on live LED, gold highlight
- Timer Chips: Fixed-width monospace display, red flash when critical
- Roster Dropdown: Custom styled select with team color accent

**Canvas Elements:**
- Court/Field: Gradient fills with proper sport colors
- Ball: Detailed rendering with shadows and sport-specific textures
- Carrier Label: White text on semi-transparent dark pill below ball
- Logo: User-uploaded with draggable handles in drag mode
- Runners (Baseball): Jersey numbers in gold circles at bases

**Sport-Specific Controls:**
Football: Quarter/Down/Distance in dedicated card with +/- steppers
Baseball: B/S/O counter grid (3 buttons each), inning display with Top/Bottom toggle
Basketball: Shot clock as large circular progress indicator

### E. Visual Effects & Interactions

**Animations (Minimal & Purposeful):**
- Button hover: Subtle lift (translateY -1px) + brightness increase
- Live LED: Gentle pulse animation (scale 1.0 → 1.1 @ 1.5s)
- Ball movement: Smooth lerp with optional trail fade
- Clock ticking: No animation, instant number updates
- Possession change: 200ms fade transition on chip text
- Sport switch: Instant field redraw, no transitions

**Hover States:**
- Buttons: Brightness 110% + subtle shadow
- Draggable elements: Cursor changes to grab/grabbing
- Interactive chips: Slight scale (1.02) on hover

**Active States:**
- Primary buttons: Brightness 90% while pressed
- Toggle groups: Selected item gets primary bg + gold top border
- Sport selector: Active sport gets thicker border + icon scale

## Layout Structure

**Left Panel (Control Sidebar):**
- Fixed width 320px, dark background
- Sections: Sport Switch → Teams → Scoreboard → Clocks → Sport Details → Logo Controls → Session
- Each section in a card with 4px bottom margin
- Scrollable overflow for small viewports

**Right Stage (Canvas + HUD):**
- Flex-grow container with centered 16:9 canvas
- Canvas wrapper maintains aspect-ratio with max constraints
- Top HUD bar: Sport icon | Live LED | Period | Game Clock | Sport Timer
- Bottom hint text: Keyboard controls in subtle gray

**Responsive Behavior:**
- Desktop: Side-by-side panel + stage
- Below 1024px: Stack vertically (panel on top)
- Canvas scales proportionally maintaining 1920×1080 logical size

## Critical UX Patterns

- All interactive elements have clear visual feedback (hover, active, disabled states)
- Timers use monospace fonts with tabular numbers for stability
- Critical actions (Reset, Clear) use secondary/outline buttons to prevent mistakes
- Live status indicators use animation sparingly (only LED pulse)
- Keyboard shortcuts shown in bottom hint bar
- Sport switch is always visible and clearly indicates active sport
- Logo drag mode has clear toggle state and visual handles when active

This design delivers a professional, broadcast-ready interface with excellent readability, precise control, and a cohesive dark sci-fi aesthetic that won't distract from the sport action on the canvas.