import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Sport = "basketball" | "football" | "baseball";
type SpeedMultiplier = 0.75 | 1.0 | 1.25 | 1.5;

interface PlayerHotkey {
  jersey: string;
  name: string;
  hotkey: string;
}

interface GameState {
  sport: Sport;
  
  // Teams
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  homeScore: number;
  awayScore: number;
  possession: "home" | "away";
  carrierNumber: string;
  carrierName: string;
  playerHotkeys: PlayerHotkey[];
  scoreHotkeys: {
    home1: string;
    home2: string;
    home3: string;
    away1: string;
    away2: string;
    away3: string;
  };
  
  // Clock
  gameClockTime: number;
  gameClockRunning: boolean;
  speedMultiplier: SpeedMultiplier;
  
  // Basketball
  shotClockTime: number;
  basketballQuarter: number;
  
  // Football
  quarter: number;
  down: number;
  toGo: number;
  playClockTime: number;
  
  // Baseball
  inning: number;
  inningHalf: "top" | "bottom";
  balls: number;
  strikes: number;
  outs: number;
  runners: { first: string; second: string; third: string };
  
  // Ball
  ballX: number;
  ballY: number;
  ballVelX: number;
  ballVelY: number;
  ballTrail: boolean;
  ballAngle: number;
  ballSize: number;
  
  // Logo
  logoX: number | null;
  logoY: number | null;
  logoScale: number;
  logoDataURL: string | null;
  
  // Football endzone logos
  homeEndzoneLogoDataURL: string | null;
  homeEndzoneLogoX: number;
  homeEndzoneLogoY: number;
  homeEndzoneLogoScale: number;
  awayEndzoneLogoDataURL: string | null;
  awayEndzoneLogoX: number;
  awayEndzoneLogoY: number;
  awayEndzoneLogoScale: number;
  
  // Video clips
  homeVideoClips: string[];
  awayVideoClips: string[];
}

interface PlayEvent {
  id: string;
  timestamp: number;
  type: "score" | "possession" | "period" | "baseball_event" | "football_down";
  description: string;
  gameState?: Partial<GameState>;
}

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const isDraggingBall = useRef(false);
  const isDraggingLogo = useRef(false);
  const dragLogoMode = useRef(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const trailPoints = useRef<Array<{ x: number; y: number; alpha: number }>>([]);
  const pulseRing = useRef({ active: false, radius: 0, alpha: 1 });
  const goalFlash = useRef<{ active: boolean; team: "home" | "away"; startTime: number }>({ 
    active: false, 
    team: "home", 
    startTime: 0 
  });
  
  // Ball physics refs (for smooth animation, synced to state periodically)
  const ballPhysics = useRef({
    x: 960,
    y: 540,
    velX: 0,
    velY: 0,
    angle: 0
  });
  
  const { toast } = useToast();

  const [state, setState] = useState<GameState>({
    sport: "basketball",
    homeTeam: "HOME",
    awayTeam: "AWAY",
    homeRoster: [],
    awayRoster: [],
    homeScore: 0,
    awayScore: 0,
    possession: "home",
    carrierNumber: "",
    carrierName: "",
    playerHotkeys: [],
    scoreHotkeys: {
      home1: "",
      home2: "",
      home3: "",
      away1: "",
      away2: "",
      away3: "",
    },
    gameClockTime: 720,
    gameClockRunning: false,
    speedMultiplier: 1.0,
    shotClockTime: 24.0,
    basketballQuarter: 1,
    quarter: 1,
    down: 1,
    toGo: 10,
    playClockTime: 40,
    inning: 1,
    inningHalf: "top",
    balls: 0,
    strikes: 0,
    outs: 0,
    runners: { first: "", second: "", third: "" },
    ballX: 960,
    ballY: 540,
    ballVelX: 0,
    ballVelY: 0,
    ballTrail: false,
    ballAngle: 0,
    ballSize: 30,
    logoX: null,
    logoY: null,
    logoScale: 0.5,
    logoDataURL: null,
    homeEndzoneLogoDataURL: null,
    homeEndzoneLogoX: 300,
    homeEndzoneLogoY: 540,
    homeEndzoneLogoScale: 0.4,
    awayEndzoneLogoDataURL: null,
    awayEndzoneLogoX: 1620,
    awayEndzoneLogoY: 540,
    awayEndzoneLogoScale: 0.4,
    homeVideoClips: [],
    awayVideoClips: [],
  });

  const [homePlayersInput, setHomePlayersInput] = useState("");
  const [awayPlayersInput, setAwayPlayersInput] = useState("");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [homeEndzoneLogoImage, setHomeEndzoneLogoImage] = useState<HTMLImageElement | null>(null);
  const [awayEndzoneLogoImage, setAwayEndzoneLogoImage] = useState<HTMLImageElement | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [playHistory, setPlayHistory] = useState<PlayEvent[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [cameraZoom, setCameraZoom] = useState(1.0);
  const [cameraPanX, setCameraPanX] = useState(0);
  const [cameraPanY, setCameraPanY] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [gameStats, setGameStats] = useState({
    homePossessionTime: 0,
    awayPossessionTime: 0,
    homeScores: [] as number[],
    awayScores: [] as number[],
    lastScoreTeam: "",
    consecutivePoints: 0,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const possessionStartTime = useRef<number>(Date.now());
  const stateRef = useRef(state);

  // Track possession time
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.gameClockRunning) {
        setGameStats(prev => ({
          ...prev,
          homePossessionTime: state.possession === "home" ? prev.homePossessionTime + 1 : prev.homePossessionTime,
          awayPossessionTime: state.possession === "away" ? prev.awayPossessionTime + 1 : prev.awayPossessionTime,
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.gameClockRunning, state.possession]);

  // Load session on mount
  useEffect(() => {
    const saved = localStorage.getItem("msv:session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setState({
          ...data,
          homeVideoClips: data.homeVideoClips || [],
          awayVideoClips: data.awayVideoClips || [],
          playerHotkeys: data.playerHotkeys || [],
          scoreHotkeys: data.scoreHotkeys || {
            home1: "",
            home2: "",
            home3: "",
            away1: "",
            away2: "",
            away3: "",
          },
          carrierName: data.carrierName || "",
        });
        
        // Sync ball physics refs
        ballPhysics.current.x = data.ballX;
        ballPhysics.current.y = data.ballY;
        ballPhysics.current.velX = data.ballVelX;
        ballPhysics.current.velY = data.ballVelY;
        ballPhysics.current.angle = data.ballAngle;
        
        // Restore logo image if data URL exists
        if (data.logoDataURL) {
          const img = new Image();
          img.onload = () => {
            setLogoImage(img);
          };
          img.src = data.logoDataURL;
        }
      } catch (e) {
        console.error("Failed to load session:", e);
      }
    } else {
      // Initialize ball physics from initial state
      ballPhysics.current.x = state.ballX;
      ballPhysics.current.y = state.ballY;
    }
  }, []);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Throttled auto-save: save once per second using latest state from ref
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        localStorage.setItem("msv:session", JSON.stringify(stateRef.current));
      } catch (e) {
        console.error("Failed to auto-save session:", e);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []); // Empty deps - runs once, saves every second

  // Sync ball physics to state periodically for persistence
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        ballX: ballPhysics.current.x,
        ballY: ballPhysics.current.y,
        ballVelX: ballPhysics.current.velX,
        ballVelY: ballPhysics.current.velY,
        ballAngle: ballPhysics.current.angle
      }));
    }, 1000); // Sync every second
    
    return () => clearInterval(interval);
  }, []);

  // Get default logo position per sport
  const getDefaultLogoPos = (sport: Sport): { x: number; y: number } => {
    switch (sport) {
      case "basketball": return { x: 1700, y: 100 };
      case "football": return { x: 1700, y: 100 };
      case "baseball": return { x: 1700, y: 100 };
    }
  };

  // Sport switcher
  const switchSport = (newSport: Sport) => {
    setState(prev => {
      const updates: Partial<GameState> = { sport: newSport };
      
      // Only apply default logo position if user hasn't set one yet
      if (prev.logoX === null || prev.logoY === null) {
        const defaultPos = getDefaultLogoPos(newSport);
        updates.logoX = defaultPos.x;
        updates.logoY = defaultPos.y;
      }
      
      return { ...prev, ...updates };
    });
  };

  // Drawing functions
  const drawBasketballCourt = (ctx: CanvasRenderingContext2D) => {
    const w = 1920, h = 1080;
    
    // Wood court gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#c19a6b");
    gradient.addColorStop(1, "#a67c52");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    
    // Border
    ctx.strokeRect(100, 100, 1720, 880);
    
    // Center circle
    ctx.beginPath();
    ctx.arc(960, 540, 120, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(960, 100);
    ctx.lineTo(960, 980);
    ctx.stroke();
    
    // 3-point arcs (simplified)
    ctx.beginPath();
    ctx.arc(200, 540, 400, -Math.PI/3, Math.PI/3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(1720, 540, 400, Math.PI*2/3, Math.PI*4/3);
    ctx.stroke();
    
    // Basketball hoops
    const drawHoop = (x: number, backboardX: number) => {
      // Backboard
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(backboardX - 5, 480, 10, 120);
      
      // Rim
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, 540, 25, 0, Math.PI * 2);
      ctx.stroke();
      
      // Net lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 25, 540 + Math.sin(angle) * 25);
        ctx.lineTo(x + Math.cos(angle) * 20, 540 + 35);
        ctx.stroke();
      }
    };
    
    drawHoop(180, 100);  // Left hoop
    drawHoop(1740, 1820); // Right hoop
  };

  const drawFootballField = (ctx: CanvasRenderingContext2D) => {
    const w = 1920, h = 1080;
    
    // Green field
    ctx.fillStyle = "#2d5016";
    ctx.fillRect(0, 0, w, h);
    
    // Sidelines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 200, 1720, 680);
    
    // Yard lines every ~172px (10 yards)
    for (let i = 1; i < 10; i++) {
      const x = 100 + i * 172;
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x, 880);
      ctx.stroke();
      
      // Hash marks
      ctx.lineWidth = 2;
      for (let y = 200; y <= 880; y += 20) {
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.stroke();
      }
      ctx.lineWidth = 4;
    }
    
    // Field goals at endzones
    const drawFieldGoal = (x: number) => {
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 8;
      
      // Uprights
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x, 50);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, 880);
      ctx.lineTo(x, 1030);
      ctx.stroke();
      
      // Crossbar
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x, 880);
      ctx.stroke();
    };
    
    drawFieldGoal(100);  // Left endzone
    drawFieldGoal(1820); // Right endzone
  };

  const drawBaseballField = (ctx: CanvasRenderingContext2D) => {
    const w = 1920, h = 1080;
    
    // Green outfield
    ctx.fillStyle = "#2d5016";
    ctx.fillRect(0, 0, w, h);
    
    // Dirt infield (diamond)
    ctx.fillStyle = "#c19a6b";
    ctx.beginPath();
    ctx.moveTo(960, 900);
    ctx.lineTo(500, 440);
    ctx.lineTo(960, 180);
    ctx.lineTo(1420, 440);
    ctx.closePath();
    ctx.fill();
    
    // Bases
    const baseSize = 30;
    const drawBase = (x: number, y: number) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - baseSize/2, y - baseSize/2, baseSize, baseSize);
    };
    
    drawBase(960, 900); // Home
    drawBase(500, 440); // First
    drawBase(960, 180); // Second
    drawBase(1420, 440); // Third
    
    // Base direction arrows
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 3;
    const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowSize = 20;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI/6), y2 - arrowSize * Math.sin(angle - Math.PI/6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI/6), y2 - arrowSize * Math.sin(angle + Math.PI/6));
      ctx.stroke();
    };
    
    drawArrow(960, 870, 530, 470);
    drawArrow(530, 440, 960, 210);
    drawArrow(960, 210, 1390, 470);
    drawArrow(1390, 440, 960, 870);
    
    // Pitcher's mound
    ctx.fillStyle = "#a67c52";
    ctx.beginPath();
    ctx.arc(960, 670, 80, 0, Math.PI * 2);
    ctx.fill();
    
    // Rubber (pitching plate)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(945, 665, 30, 10);
  };

  const drawBall = (ctx: CanvasRenderingContext2D) => {
    const { sport, carrierNumber, ballSize } = state;
    const ballX = ballPhysics.current.x;
    const ballY = ballPhysics.current.y;
    const ballAngle = ballPhysics.current.angle;
    
    ctx.save();
    
    // Draw trail
    if (state.ballTrail && trailPoints.current.length > 0) {
      trailPoints.current.forEach(point => {
        ctx.fillStyle = `rgba(255, 255, 255, ${point.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, ballSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // Draw pulse ring
    if (pulseRing.current.active && pulseRing.current.radius > 0) {
      ctx.strokeStyle = `rgba(59, 130, 246, ${Math.max(0, pulseRing.current.alpha)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ballX, ballY, Math.max(0, pulseRing.current.radius), 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.translate(ballX, ballY);
    if (sport === "football") {
      ctx.rotate(ballAngle);
    }
    
    // Ball shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    const shadowRadius = sport === "football" ? ballSize * 1.25 : ballSize;
    const shadowHeight = sport === "football" ? ballSize * 0.75 : ballSize;
    ctx.ellipse(5, 5, shadowRadius, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ball based on sport
    if (sport === "basketball") {
      // Orange basketball
      ctx.fillStyle = "#ff8c00";
      ctx.beginPath();
      ctx.arc(0, 0, ballSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Seams
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ballSize, Math.PI/4, Math.PI*3/4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ballSize, Math.PI*5/4, Math.PI*7/4);
      ctx.stroke();
    } else if (sport === "football") {
      // Brown football
      ctx.fillStyle = "#6b4423";
      ctx.beginPath();
      ctx.ellipse(0, 0, ballSize * 1.25, ballSize * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Laces
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      for (let i = -8; i <= 8; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -3);
        ctx.lineTo(i, 3);
        ctx.stroke();
      }
    } else if (sport === "baseball") {
      // White baseball
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, ballSize * 0.9, 0, Math.PI * 2);
      ctx.fill();
      
      // Red stitching
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ballSize * 0.75, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ballSize * 0.75, Math.PI + 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Carrier label
    if (carrierNumber) {
      const hasName = state.carrierName && state.carrierName.trim() !== "";
      const labelHeight = hasName ? 50 : 24;
      const labelWidth = hasName ? Math.max(100, state.carrierName.length * 10) : 50;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(ballX - labelWidth/2, ballY + 30, labelWidth, labelHeight);
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 16px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${carrierNumber}`, ballX, ballY + (hasName ? 42 : 42));
      
      if (hasName) {
        ctx.font = "500 16px 'JetBrains Mono'";
        ctx.fillText(state.carrierName, ballX, ballY + 62);
      }
    }
  };

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
    const { logoX, logoY, logoScale } = state;
    if (logoImage && logoX !== null && logoY !== null) {
      const w = logoImage.width * logoScale;
      const h = logoImage.height * logoScale;
      ctx.drawImage(logoImage, logoX - w/2, logoY - h/2, w, h);
      
      // Draw drag handles if in drag mode
      if (dragLogoMode.current) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(logoX - w/2 - 5, logoY - h/2 - 5, w + 10, h + 10);
        ctx.setLineDash([]);
      }
    }
  };

  const drawEndzoneLogos = (ctx: CanvasRenderingContext2D) => {
    if (state.sport !== "football") return;
    
    // Home endzone logo
    if (homeEndzoneLogoImage && state.homeEndzoneLogoDataURL) {
      const w = homeEndzoneLogoImage.width * state.homeEndzoneLogoScale;
      const h = homeEndzoneLogoImage.height * state.homeEndzoneLogoScale;
      ctx.drawImage(homeEndzoneLogoImage, state.homeEndzoneLogoX - w/2, state.homeEndzoneLogoY - h/2, w, h);
    }
    
    // Away endzone logo
    if (awayEndzoneLogoImage && state.awayEndzoneLogoDataURL) {
      const w = awayEndzoneLogoImage.width * state.awayEndzoneLogoScale;
      const h = awayEndzoneLogoImage.height * state.awayEndzoneLogoScale;
      ctx.drawImage(awayEndzoneLogoImage, state.awayEndzoneLogoX - w/2, state.awayEndzoneLogoY - h/2, w, h);
    }
  };

  const drawRunners = (ctx: CanvasRenderingContext2D) => {
    const { runners } = state;
    const bases = [
      { x: 500, y: 440, runner: runners.first },
      { x: 960, y: 180, runner: runners.second },
      { x: 1420, y: 440, runner: runners.third },
    ];
    
    bases.forEach(base => {
      if (base.runner) {
        ctx.fillStyle = "rgba(234, 179, 8, 0.9)";
        ctx.beginPath();
        ctx.arc(base.x, base.y - 50, 18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#000000";
        ctx.font = "600 14px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(base.runner, base.x, base.y - 50);
      }
    });
  };

  // Render loop
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    
    // Clear
    ctx.clearRect(0, 0, 1920, 1080);
    
    // Apply camera transformations
    ctx.save();
    ctx.translate(960 + cameraPanX, 540 + cameraPanY);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-960, -540);
    
    // Draw field
    if (state.sport === "basketball") drawBasketballCourt(ctx);
    else if (state.sport === "football") drawFootballField(ctx);
    else if (state.sport === "baseball") drawBaseballField(ctx);
    
    // Draw runners for baseball
    if (state.sport === "baseball") {
      drawRunners(ctx);
    }
    
    // Draw logo
    drawLogo(ctx);
    
    // Draw endzone logos (football only)
    drawEndzoneLogos(ctx);
    
    // Draw goal flash effect
    if (goalFlash.current.active) {
      const elapsed = timestamp - goalFlash.current.startTime;
      const duration = 800; // 800ms
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const alpha = Math.max(0, 1 - progress);
        const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
        
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.3})`;
        
        if (state.sport === "basketball") {
          // Light up the hoop area
          const hoopX = goalFlash.current.team === "home" ? 180 : 1740;
          const hoopY = 540;
          const radius = 120 * pulseScale;
          
          ctx.beginPath();
          ctx.arc(hoopX, hoopY, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer glow
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
          ctx.lineWidth = 15;
          ctx.stroke();
        } else if (state.sport === "football") {
          // Light up the endzone
          const endzoneX = goalFlash.current.team === "home" ? 100 : 1820;
          const rectWidth = 100;
          
          ctx.fillRect(endzoneX - rectWidth / 2, 200, rectWidth, 680);
          
          // Outer glow
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
          ctx.lineWidth = 15;
          ctx.strokeRect(endzoneX - rectWidth / 2, 200, rectWidth, 680);
        } else if (state.sport === "baseball") {
          // Light up home plate area
          const homeX = 960;
          const homeY = 900;
          const size = 100 * pulseScale;
          
          ctx.beginPath();
          ctx.arc(homeX, homeY, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer glow
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
          ctx.lineWidth = 15;
          ctx.stroke();
        }
      } else {
        goalFlash.current.active = false;
      }
    }
    
    // Update ball movement
    if (!isDraggingBall.current) {
      const speed = keysPressed.current.has("Shift") ? 400 : 200;
      let targetVelX = 0, targetVelY = 0;
      
      if (keysPressed.current.has("ArrowLeft")) targetVelX -= speed;
      if (keysPressed.current.has("ArrowRight")) targetVelX += speed;
      if (keysPressed.current.has("ArrowUp")) targetVelY -= speed;
      if (keysPressed.current.has("ArrowDown")) targetVelY += speed;
      
      // Smooth lerp
      const lerp = 0.15;
      ballPhysics.current.velX += (targetVelX - ballPhysics.current.velX) * lerp;
      ballPhysics.current.velY += (targetVelY - ballPhysics.current.velY) * lerp;
      
      ballPhysics.current.x += ballPhysics.current.velX * dt;
      ballPhysics.current.y += ballPhysics.current.velY * dt;
      
      // Bounds
      ballPhysics.current.x = Math.max(50, Math.min(1870, ballPhysics.current.x));
      ballPhysics.current.y = Math.max(50, Math.min(1030, ballPhysics.current.y));
      
      // Football rotation based on movement
      if (state.sport === "football" && (Math.abs(ballPhysics.current.velX) > 10 || Math.abs(ballPhysics.current.velY) > 10)) {
        ballPhysics.current.angle = Math.atan2(ballPhysics.current.velY, ballPhysics.current.velX);
      }
      
      // Trail
      if (state.ballTrail && (Math.abs(ballPhysics.current.velX) > 50 || Math.abs(ballPhysics.current.velY) > 50)) {
        trailPoints.current.push({ x: ballPhysics.current.x, y: ballPhysics.current.y, alpha: 1 });
        if (trailPoints.current.length > 20) trailPoints.current.shift();
      }
    }
    
    // Update trail alpha
    trailPoints.current.forEach(p => { p.alpha *= 0.95; });
    trailPoints.current = trailPoints.current.filter(p => p.alpha > 0.05);
    
    // Update pulse ring
    if (pulseRing.current.active) {
      pulseRing.current.radius = Math.max(0, pulseRing.current.radius + 200 * dt);
      pulseRing.current.alpha = Math.max(0, pulseRing.current.alpha - 2 * dt);
      if (pulseRing.current.alpha <= 0) {
        pulseRing.current.active = false;
        pulseRing.current.radius = 0;
      }
    }
    
    // Draw ball
    drawBall(ctx);
    
    // Restore camera transformations
    ctx.restore();
    
    // Update clocks
    if (state.gameClockRunning && state.gameClockTime > 0) {
      setState(prev => ({
        ...prev,
        gameClockTime: Math.max(0, prev.gameClockTime - dt * prev.speedMultiplier)
      }));
    }
    
    if (state.sport === "basketball" && state.gameClockRunning && state.shotClockTime > 0) {
      setState(prev => ({
        ...prev,
        shotClockTime: Math.max(0, prev.shotClockTime - dt * prev.speedMultiplier)
      }));
    }
    
    if (state.sport === "football" && state.gameClockRunning && state.playClockTime > 0) {
      setState(prev => ({
        ...prev,
        playClockTime: Math.max(0, prev.playClockTime - dt * prev.speedMultiplier)
      }));
    }
    
    animationRef.current = requestAnimationFrame(render);
  }, [state]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [render]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        pulseRing.current = { active: true, radius: 30, alpha: 1 };
      }
      if (e.key === "Shift") {
        keysPressed.current.add("Shift");
      }
      
      // Check for player hotkeys
      const playerHotkey = stateRef.current.playerHotkeys.find(h => h.hotkey.toLowerCase() === e.key.toLowerCase());
      if (playerHotkey) {
        setState(prev => ({ 
          ...prev, 
          carrierNumber: playerHotkey.jersey,
          carrierName: playerHotkey.name 
        }));
        toast({ description: `${playerHotkey.name} (#${playerHotkey.jersey}) set as carrier` });
        return;
      }
      
      // Check for score hotkeys
      const triggerScore = (team: "home" | "away", points: number) => {
        setState(prev => {
          const newScore = (team === "home" ? prev.homeScore : prev.awayScore) + points;
          const teamName = team === "home" ? prev.homeTeam : prev.awayTeam;
          
          // Update game stats
          setGameStats(prevStats => ({
            ...prevStats,
            [team === "home" ? "homeScores" : "awayScores"]: [...(team === "home" ? prevStats.homeScores : prevStats.awayScores), points],
            consecutivePoints: prevStats.lastScoreTeam === team ? prevStats.consecutivePoints + points : points,
            lastScoreTeam: team
          }));
          
          // Log event
          setPlayHistory(prevHistory => [{
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: "score" as const,
            description: `${teamName} +${points} (${newScore})`
          }, ...prevHistory].slice(0, 100));
          
          // Play sound
          if (soundEnabled && volume > 0) {
            const frequencies = { 1: 523, 2: 659, 3: 784 };
            const frequency = frequencies[points as keyof typeof frequencies] || 523;
            
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
          }
          
          // Trigger goal flash
          goalFlash.current = { active: true, team, startTime: performance.now() };
          
          return { 
            ...prev, 
            [team === "home" ? "homeScore" : "awayScore"]: newScore
          };
        });
      };
      
      const hotkeys = stateRef.current.scoreHotkeys;
      if (hotkeys.home1 && e.key.toLowerCase() === hotkeys.home1.toLowerCase()) {
        triggerScore("home", 1);
      } else if (hotkeys.home2 && e.key.toLowerCase() === hotkeys.home2.toLowerCase()) {
        triggerScore("home", 2);
      } else if (hotkeys.home3 && e.key.toLowerCase() === hotkeys.home3.toLowerCase()) {
        triggerScore("home", 3);
      } else if (hotkeys.away1 && e.key.toLowerCase() === hotkeys.away1.toLowerCase()) {
        triggerScore("away", 1);
      } else if (hotkeys.away2 && e.key.toLowerCase() === hotkeys.away2.toLowerCase()) {
        triggerScore("away", 2);
      } else if (hotkeys.away3 && e.key.toLowerCase() === hotkeys.away3.toLowerCase()) {
        triggerScore("away", 3);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [toast, soundEnabled, volume]);

  // Mouse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1920 / rect.width;
      const scaleY = 1080 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      mousePos.current = { x, y };
      
      // Check logo drag
      if (dragLogoMode.current && logoImage && state.logoX !== null && state.logoY !== null) {
        const w = logoImage.width * state.logoScale;
        const h = logoImage.height * state.logoScale;
        if (x >= state.logoX - w/2 - 5 && x <= state.logoX + w/2 + 5 &&
            y >= state.logoY - h/2 - 5 && y <= state.logoY + h/2 + 5) {
          isDraggingLogo.current = true;
          return;
        }
      }
      
      // Check ball drag
      const dist = Math.sqrt((x - ballPhysics.current.x) ** 2 + (y - ballPhysics.current.y) ** 2);
      if (dist < state.ballSize + 10) {
        isDraggingBall.current = true;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1920 / rect.width;
      const scaleY = 1080 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      if (isDraggingBall.current) {
        ballPhysics.current.x = x;
        ballPhysics.current.y = y;
        ballPhysics.current.velX = 0;
        ballPhysics.current.velY = 0;
        // Immediately sync to state for persistence
        setState(prev => ({ ...prev, ballX: x, ballY: y, ballVelX: 0, ballVelY: 0 }));
      } else if (isDraggingLogo.current) {
        setState(prev => ({ ...prev, logoX: x, logoY: y }));
      }
      
      mousePos.current = { x, y };
    };
    
    const handleMouseUp = () => {
      isDraggingBall.current = false;
      isDraggingLogo.current = false;
    };
    
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [state]);

  // Team functions
  const saveTeam = (type: "home" | "away") => {
    const data = {
      name: type === "home" ? state.homeTeam : state.awayTeam,
      roster: type === "home" ? state.homeRoster : state.awayRoster
    };
    localStorage.setItem(`msv:${type}`, JSON.stringify(data));
    toast({ description: `${type.toUpperCase()} team saved` });
  };

  // Removed old loadTeam function - now using loadTeamPlayers with new format

  const parseRoster = (input: string): string[] => {
    return input.split(",").map(s => s.trim()).filter(s => s.length > 0);
  };

  const loadTeamPlayers = (team: "home" | "away") => {
    const input = team === "home" ? homePlayersInput : awayPlayersInput;
    const lines = input.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const roster: string[] = [];
    const hotkeys: PlayerHotkey[] = [];
    const errors: string[] = [];
    const usedHotkeys = new Set<string>();

    for (const line of lines) {
      // Format: "Name #number, hotkey" e.g., "Amen Thompson #1, q"
      const commaIndex = line.lastIndexOf(",");
      if (commaIndex === -1) {
        errors.push(`Missing hotkey: "${line}" (expected format: Name #number, hotkey)`);
        continue;
      }

      const playerPart = line.substring(0, commaIndex).trim();
      const hotkey = line.substring(commaIndex + 1).trim();

      // Extract number from player part (look for #number)
      const hashIndex = playerPart.lastIndexOf("#");
      if (hashIndex === -1) {
        errors.push(`Missing #number: "${line}" (expected format: Name #number, hotkey)`);
        continue;
      }

      const name = playerPart.substring(0, hashIndex).trim();
      const jersey = playerPart.substring(hashIndex + 1).trim();

      // Validate jersey number
      if (!jersey || jersey.length === 0) {
        errors.push(`Missing jersey number in: "${line}"`);
        continue;
      }

      // Validate name
      if (!name || name.length === 0) {
        errors.push(`Missing player name in: "${line}"`);
        continue;
      }

      // Validate hotkey
      if (!hotkey || !/^[0-9a-z]$/.test(hotkey.toLowerCase())) {
        errors.push(`Invalid hotkey "${hotkey}" (must be 0-9 or a-z)`);
        continue;
      }

      // Check for duplicate hotkeys
      if (usedHotkeys.has(hotkey.toLowerCase())) {
        errors.push(`Duplicate hotkey "${hotkey}" in: "${line}"`);
        continue;
      }

      usedHotkeys.add(hotkey.toLowerCase());
      roster.push(jersey);
      hotkeys.push({ jersey, name, hotkey: hotkey.toLowerCase() });
    }

    // All-or-nothing: if there are ANY errors, don't load anything
    if (errors.length > 0) {
      toast({ 
        description: errors.join("\n"), 
        variant: "destructive" 
      });
      return;
    }

    if (roster.length > 0) {
      // Update roster
      if (team === "home") {
        setState(prev => ({ ...prev, homeRoster: roster }));
      } else {
        setState(prev => ({ ...prev, awayRoster: roster }));
      }

      // Update hotkeys (merge with existing hotkeys from other team)
      setState(prev => {
        const otherTeamHotkeys = prev.playerHotkeys.filter(h => 
          team === "home" ? !roster.includes(h.jersey) : roster.includes(h.jersey)
        );
        return { ...prev, playerHotkeys: [...otherTeamHotkeys, ...hotkeys] };
      });

      toast({ description: `Loaded ${roster.length} ${team} player(s)` });
    }
  };

  const clearTeamPlayers = (team: "home" | "away") => {
    if (team === "home") {
      setState(prev => ({
        ...prev,
        homeRoster: [],
        playerHotkeys: prev.playerHotkeys.filter(h => !prev.homeRoster.includes(h.jersey))
      }));
      setHomePlayersInput("");
    } else {
      setState(prev => ({
        ...prev,
        awayRoster: [],
        playerHotkeys: prev.playerHotkeys.filter(h => !prev.awayRoster.includes(h.jersey))
      }));
      setAwayPlayersInput("");
    }
    toast({ description: `Cleared ${team} roster and hotkeys` });
  };

  // Session functions
  const saveSession = () => {
    const session = { ...state };
    localStorage.setItem("msv:session", JSON.stringify(session));
    toast({ description: "Session saved" });
  };

  const loadSession = () => {
    const saved = localStorage.getItem("msv:session");
    if (saved) {
      const data = JSON.parse(saved);
      setState({
        ...data,
        homeVideoClips: data.homeVideoClips || [],
        awayVideoClips: data.awayVideoClips || [],
        basketballQuarter: data.basketballQuarter || 1,
        quarter: data.quarter || 1
      });
      
      // Restore logo image if data URL exists
      if (data.logoDataURL) {
        const img = new Image();
        img.onload = () => {
          setLogoImage(img);
        };
        img.src = data.logoDataURL;
      } else {
        setLogoImage(null);
      }
      
      // Restore endzone logos
      if (data.homeEndzoneLogoDataURL) {
        const img = new Image();
        img.onload = () => {
          setHomeEndzoneLogoImage(img);
        };
        img.src = data.homeEndzoneLogoDataURL;
      } else {
        setHomeEndzoneLogoImage(null);
      }
      
      if (data.awayEndzoneLogoDataURL) {
        const img = new Image();
        img.onload = () => {
          setAwayEndzoneLogoImage(img);
        };
        img.src = data.awayEndzoneLogoDataURL;
      } else {
        setAwayEndzoneLogoImage(null);
      }
      
      toast({ description: "Session loaded" });
    }
  };

  const newSession = () => {
    localStorage.removeItem("msv:session");
    window.location.reload();
  };

  // Logo functions
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setLogoImage(img);
          setState(prev => {
            // Initialize logo position if not set
            const updates: Partial<GameState> = { logoDataURL: dataURL };
            if (prev.logoX === null || prev.logoY === null) {
              const defaultPos = getDefaultLogoPos(prev.sport);
              updates.logoX = defaultPos.x;
              updates.logoY = defaultPos.y;
            }
            return { ...prev, ...updates };
          });
        };
        img.src = dataURL;
      };
      reader.readAsDataURL(file);
    }
  };

  const setLogoPreset = (preset: string) => {
    let x = 0, y = 0;
    switch (preset) {
      case "auto":
        const pos = getDefaultLogoPos(state.sport);
        x = pos.x;
        y = pos.y;
        break;
      case "top-left": x = 150; y = 100; break;
      case "top-right": x = 1770; y = 100; break;
      case "center": x = 960; y = 540; break;
      case "bottom-left": x = 150; y = 980; break;
      case "bottom-right": x = 1770; y = 980; break;
    }
    setState(prev => ({ ...prev, logoX: x, logoY: y }));
  };

  const handleHomeEndzoneLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setHomeEndzoneLogoImage(img);
          setState(prev => ({ ...prev, homeEndzoneLogoDataURL: dataURL }));
        };
        img.src = dataURL;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAwayEndzoneLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setAwayEndzoneLogoImage(img);
          setState(prev => ({ ...prev, awayEndzoneLogoDataURL: dataURL }));
        };
        img.src = dataURL;
      };
      reader.readAsDataURL(file);
    }
  };

  // Video clip handlers
  const handleVideoUpload = (team: "home" | "away", index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({ description: "Please select a valid video file", variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target?.result as string;
        setState(prev => {
          const clips = team === "home" ? [...prev.homeVideoClips] : [...prev.awayVideoClips];
          clips[index] = dataURL;
          return {
            ...prev,
            [team === "home" ? "homeVideoClips" : "awayVideoClips"]: clips
          };
        });
        toast({ description: `Video ${index + 1} uploaded for ${team} team` });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeVideoClip = (team: "home" | "away", index: number) => {
    setState(prev => {
      const clips = team === "home" ? [...prev.homeVideoClips] : [...prev.awayVideoClips];
      clips[index] = "";
      return {
        ...prev,
        [team === "home" ? "homeVideoClips" : "awayVideoClips"]: clips
      };
    });
  };

  // Sound effects using Web Audio API
  const playSound = (frequency: number, duration: number = 0.15) => {
    if (!soundEnabled || volume === 0) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  };
  
  const playScoringSound = (points: number) => {
    const frequencies = { 1: 523, 2: 659, 3: 784 }; // C5, E5, G5
    playSound(frequencies[points as keyof typeof frequencies] || 523, 0.2);
  };
  
  const playPossessionSound = () => {
    playSound(440, 0.1); // A4
  };
  
  const playClockWarningSound = () => {
    playSound(220, 0.1); // A3 (lower pitch for warning)
  };

  // Export functions
  const exportSessionJSON = () => {
    const exportData = {
      ...state,
      gameStats,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHistoryCSV = () => {
    const headers = ['Timestamp', 'Type', 'Description'];
    const rows = playHistory.map(event => [
      new Date(event.timestamp).toISOString(),
      event.type,
      event.description
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `play-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Camera presets
  const resetCamera = () => {
    setCameraZoom(1.0);
    setCameraPanX(0);
    setCameraPanY(0);
  };

  const applyCameraPreset = (preset: string) => {
    switch (preset) {
      case "center":
        setCameraZoom(1.0);
        setCameraPanX(0);
        setCameraPanY(0);
        break;
      case "zoom-goal":
        // Zoom into goal/endzone area
        if (state.sport === "basketball") {
          setCameraZoom(2.0);
          setCameraPanX(-400);
          setCameraPanY(-200);
        } else if (state.sport === "football") {
          setCameraZoom(1.8);
          setCameraPanX(-500);
          setCameraPanY(0);
        } else if (state.sport === "baseball") {
          setCameraZoom(2.0);
          setCameraPanX(0);
          setCameraPanY(-300);
        }
        break;
      case "wide":
        setCameraZoom(0.8);
        setCameraPanX(0);
        setCameraPanY(0);
        break;
      case "action":
        setCameraZoom(1.5);
        setCameraPanX(cameraPanX);
        setCameraPanY(cameraPanY);
        break;
    }
  };

  // Event logging
  const logEvent = (type: PlayEvent["type"], description: string, gameState?: Partial<GameState>) => {
    const event: PlayEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type,
      description,
      gameState
    };
    setPlayHistory(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const allRoster = [...state.homeRoster, ...state.awayRoster];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Control Panel */}
      <div className="w-80 bg-card border-r border-card-border overflow-y-auto p-4 space-y-4">
        {/* Sport Switcher */}
        <Card className="p-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Sport</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              data-testid="button-sport-basketball"
              variant={state.sport === "basketball" ? "default" : "outline"}
              size="sm"
              onClick={() => switchSport("basketball")}
              className="text-lg"
            >
              🏀
            </Button>
            <Button
              data-testid="button-sport-football"
              variant={state.sport === "football" ? "default" : "outline"}
              size="sm"
              onClick={() => switchSport("football")}
              className="text-lg"
            >
              🏈
            </Button>
            <Button
              data-testid="button-sport-baseball"
              variant={state.sport === "baseball" ? "default" : "outline"}
              size="sm"
              onClick={() => switchSport("baseball")}
              className="text-lg"
            >
              ⚾
            </Button>
          </div>
        </Card>

        {/* Teams & Player Hotkeys */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Teams & Player Hotkeys</Label>
          
          {/* Home Team */}
          <div className="space-y-2">
            <Input
              data-testid="input-home-team"
              placeholder="Home Team Name"
              value={state.homeTeam}
              onChange={(e) => setState(prev => ({ ...prev, homeTeam: e.target.value }))}
              className="font-semibold"
            />
            <Textarea
              data-testid="input-home-players"
              placeholder="Format: Name #number, hotkey&#10;Example:&#10;Amen Thompson #1, q&#10;Fred VanVleet #5, w&#10;Jalen Green #4, e"
              value={homePlayersInput}
              onChange={(e) => setHomePlayersInput(e.target.value)}
              className="text-xs font-mono min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <Button 
                data-testid="button-load-home" 
                size="sm" 
                variant="default" 
                onClick={() => loadTeamPlayers("home")} 
                className="flex-1"
              >
                Load Home
              </Button>
              <Button 
                data-testid="button-clear-home" 
                size="sm" 
                variant="outline" 
                onClick={() => clearTeamPlayers("home")} 
                className="flex-1"
              >
                Clear Home
              </Button>
            </div>
          </div>

          {/* Away Team */}
          <div className="space-y-2">
            <Input
              data-testid="input-away-team"
              placeholder="Away Team Name"
              value={state.awayTeam}
              onChange={(e) => setState(prev => ({ ...prev, awayTeam: e.target.value }))}
              className="font-semibold"
            />
            <Textarea
              data-testid="input-away-players"
              placeholder="Format: Name #number, hotkey&#10;Example:&#10;Stephen Curry #30, a&#10;Klay Thompson #11, s&#10;Draymond Green #23, d"
              value={awayPlayersInput}
              onChange={(e) => setAwayPlayersInput(e.target.value)}
              className="text-xs font-mono min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <Button 
                data-testid="button-load-away" 
                size="sm" 
                variant="default" 
                onClick={() => loadTeamPlayers("away")} 
                className="flex-1"
              >
                Load Away
              </Button>
              <Button 
                data-testid="button-clear-away" 
                size="sm" 
                variant="outline" 
                onClick={() => clearTeamPlayers("away")} 
                className="flex-1"
              >
                Clear Away
              </Button>
            </div>
          </div>

          {/* Active Hotkeys Display */}
          {state.playerHotkeys.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-1">Active Hotkeys:</div>
              <div className="text-xs space-y-1">
                {state.playerHotkeys.filter(h => h.hotkey).map(h => (
                  <div key={h.jersey} className="flex justify-between">
                    <span className="font-bold">{h.hotkey.toUpperCase()}</span>
                    <span className="font-mono">{h.name} #{h.jersey}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Carrier Display */}
          {state.carrierNumber && (
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-1">Current {state.sport === "baseball" ? "At-Bat" : "Ball Carrier"}:</div>
              <div className="text-sm font-semibold text-center">
                {state.carrierName} #{state.carrierNumber}
              </div>
            </div>
          )}
        </Card>

        {/* Video Clips */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Video Clips</Label>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-2">{state.homeTeam} Team</div>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map(index => (
                  <div key={`home-${index}`} className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload("home", index, e)}
                        className="text-xs"
                        data-testid={`input-home-video-${index}`}
                      />
                      {state.homeVideoClips?.[index] && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setPlayingVideo(state.homeVideoClips[index])}
                            data-testid={`button-play-home-${index}`}
                          >
                            Play
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeVideoClip("home", index)}
                            data-testid={`button-remove-home-${index}`}
                          >
                            ✕
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">{state.awayTeam} Team</div>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map(index => (
                  <div key={`away-${index}`} className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload("away", index, e)}
                        className="text-xs"
                        data-testid={`input-away-video-${index}`}
                      />
                      {state.awayVideoClips?.[index] && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setPlayingVideo(state.awayVideoClips[index])}
                            data-testid={`button-play-away-${index}`}
                          >
                            Play
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeVideoClip("away", index)}
                            data-testid={`button-remove-away-${index}`}
                          >
                            ✕
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Basketball Shot Clock Reset (moved here) */}
        {state.sport === "basketball" && (
          <Card className="p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Shot Clock Reset</Label>
            <div className="flex gap-2">
              <Button data-testid="button-shot-14" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, shotClockTime: 14.0 }))} className="flex-1">24→14</Button>
              <Button data-testid="button-shot-reset" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, shotClockTime: 24.0 }))} className="flex-1">Reset 24</Button>
            </div>
          </Card>
        )}

        {/* Scoreboard */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Scoreboard</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{state.homeTeam}</span>
              <div className="flex gap-1">
                <Button data-testid="button-home-plus1" size="sm" variant="outline" onClick={() => { 
                  setState(prev => ({ ...prev, homeScore: prev.homeScore + 1 })); 
                  logEvent("score", `${state.homeTeam} +1 (${state.homeScore + 1})`); 
                  playScoringSound(1);
                  setGameStats(prev => ({
                    ...prev,
                    homeScores: [...prev.homeScores, 1],
                    consecutivePoints: prev.lastScoreTeam === "home" ? prev.consecutivePoints + 1 : 1,
                    lastScoreTeam: "home"
                  }));
                  goalFlash.current = { active: true, team: "home", startTime: performance.now() };
                }}>{state.scoreHotkeys.home1 ? `+1 (${state.scoreHotkeys.home1.toUpperCase()})` : "+1"}</Button>
                {state.sport !== "baseball" && <Button data-testid="button-home-plus2" size="sm" variant="outline" onClick={() => { 
                  setState(prev => ({ ...prev, homeScore: prev.homeScore + 2 })); 
                  logEvent("score", `${state.homeTeam} +2 (${state.homeScore + 2})`); 
                  playScoringSound(2);
                  setGameStats(prev => ({
                    ...prev,
                    homeScores: [...prev.homeScores, 2],
                    consecutivePoints: prev.lastScoreTeam === "home" ? prev.consecutivePoints + 2 : 2,
                    lastScoreTeam: "home"
                  }));
                  goalFlash.current = { active: true, team: "home", startTime: performance.now() };
                }}>{state.scoreHotkeys.home2 ? `+2 (${state.scoreHotkeys.home2.toUpperCase()})` : "+2"}</Button>}
                {state.sport !== "baseball" && <Button data-testid="button-home-plus3" size="sm" variant="outline" onClick={() => { 
                  setState(prev => ({ ...prev, homeScore: prev.homeScore + 3 })); 
                  logEvent("score", `${state.homeTeam} +3 (${state.homeScore + 3})`); 
                  playScoringSound(3);
                  setGameStats(prev => ({
                    ...prev,
                    homeScores: [...prev.homeScores, 3],
                    consecutivePoints: prev.lastScoreTeam === "home" ? prev.consecutivePoints + 3 : 3,
                    lastScoreTeam: "home"
                  }));
                  goalFlash.current = { active: true, team: "home", startTime: performance.now() };
                }}>{state.scoreHotkeys.home3 ? `+3 (${state.scoreHotkeys.home3.toUpperCase()})` : "+3"}</Button>}
              </div>
              <span data-testid="text-home-score" className="text-2xl font-display font-bold">{state.homeScore}</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex gap-1 items-center">
                <span className="w-12">+1 Key:</span>
                <Input
                  data-testid="input-hotkey-home1"
                  value={state.scoreHotkeys.home1}
                  onChange={(e) => {
                    const key = e.target.value.slice(-1).toLowerCase();
                    if (key && !/^[0-9a-z]$/.test(key)) return;
                    setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, home1: key } }));
                  }}
                  maxLength={1}
                  className="h-6 w-12 text-xs text-center"
                  placeholder="?"
                />
                {state.sport !== "baseball" && (
                  <>
                    <span className="w-12 ml-2">+2 Key:</span>
                    <Input
                      data-testid="input-hotkey-home2"
                      value={state.scoreHotkeys.home2}
                      onChange={(e) => {
                        const key = e.target.value.slice(-1).toLowerCase();
                        if (key && !/^[0-9a-z]$/.test(key)) return;
                        setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, home2: key } }));
                      }}
                      maxLength={1}
                      className="h-6 w-12 text-xs text-center"
                      placeholder="?"
                    />
                  </>
                )}
                {state.sport !== "baseball" && (
                  <>
                    <span className="w-12 ml-2">+3 Key:</span>
                    <Input
                      data-testid="input-hotkey-home3"
                      value={state.scoreHotkeys.home3}
                      onChange={(e) => {
                        const key = e.target.value.slice(-1).toLowerCase();
                        if (key && !/^[0-9a-z]$/.test(key)) return;
                        setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, home3: key } }));
                      }}
                      maxLength={1}
                      className="h-6 w-12 text-xs text-center"
                      placeholder="?"
                    />
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{state.awayTeam}</span>
              <div className="flex gap-1">
                <Button data-testid="button-away-plus1" size="sm" variant="outline" onClick={() => { 
                  setState(prev => ({ ...prev, awayScore: prev.awayScore + 1 })); 
                  logEvent("score", `${state.awayTeam} +1 (${state.awayScore + 1})`); 
                  playScoringSound(1);
                  setGameStats(prev => ({
                    ...prev,
                    awayScores: [...prev.awayScores, 1],
                    consecutivePoints: prev.lastScoreTeam === "away" ? prev.consecutivePoints + 1 : 1,
                    lastScoreTeam: "away"
                  }));
                  goalFlash.current = { active: true, team: "away", startTime: performance.now() };
                }}>{state.scoreHotkeys.away1 ? `+1 (${state.scoreHotkeys.away1.toUpperCase()})` : "+1"}</Button>
                {state.sport !== "baseball" && <Button data-testid="button-away-plus2" size="sm" variant="outline" onClick={() => { 
                  setState(prev => ({ ...prev, awayScore: prev.awayScore + 2 })); 
                  logEvent("score", `${state.awayTeam} +2 (${state.awayScore + 2})`); 
                  playScoringSound(2);
                  setGameStats(prev => ({
                    ...prev,
                    awayScores: [...prev.awayScores, 2],
                    consecutivePoints: prev.lastScoreTeam === "away" ? prev.consecutivePoints + 2 : 2,
                    lastScoreTeam: "away"
                  }));
                  goalFlash.current = { active: true, team: "away", startTime: performance.now() };
                }}>{state.scoreHotkeys.away2 ? `+2 (${state.scoreHotkeys.away2.toUpperCase()})` : "+2"}</Button>}
                {state.sport !== "baseball" && <Button data-testid="button-away-plus3" size="sm" variant="outline" onClick={() => { 
                  setState(prev => ({ ...prev, awayScore: prev.awayScore + 3 })); 
                  logEvent("score", `${state.awayTeam} +3 (${state.awayScore + 3})`); 
                  playScoringSound(3);
                  setGameStats(prev => ({
                    ...prev,
                    awayScores: [...prev.awayScores, 3],
                    consecutivePoints: prev.lastScoreTeam === "away" ? prev.consecutivePoints + 3 : 3,
                    lastScoreTeam: "away"
                  }));
                  goalFlash.current = { active: true, team: "away", startTime: performance.now() };
                }}>{state.scoreHotkeys.away3 ? `+3 (${state.scoreHotkeys.away3.toUpperCase()})` : "+3"}</Button>}
              </div>
              <span data-testid="text-away-score" className="text-2xl font-display font-bold">{state.awayScore}</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex gap-1 items-center">
                <span className="w-12">+1 Key:</span>
                <Input
                  data-testid="input-hotkey-away1"
                  value={state.scoreHotkeys.away1}
                  onChange={(e) => {
                    const key = e.target.value.slice(-1).toLowerCase();
                    if (key && !/^[0-9a-z]$/.test(key)) return;
                    setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, away1: key } }));
                  }}
                  maxLength={1}
                  className="h-6 w-12 text-xs text-center"
                  placeholder="?"
                />
                {state.sport !== "baseball" && (
                  <>
                    <span className="w-12 ml-2">+2 Key:</span>
                    <Input
                      data-testid="input-hotkey-away2"
                      value={state.scoreHotkeys.away2}
                      onChange={(e) => {
                        const key = e.target.value.slice(-1).toLowerCase();
                        if (key && !/^[0-9a-z]$/.test(key)) return;
                        setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, away2: key } }));
                      }}
                      maxLength={1}
                      className="h-6 w-12 text-xs text-center"
                      placeholder="?"
                    />
                  </>
                )}
                {state.sport !== "baseball" && (
                  <>
                    <span className="w-12 ml-2">+3 Key:</span>
                    <Input
                      data-testid="input-hotkey-away3"
                      value={state.scoreHotkeys.away3}
                      onChange={(e) => {
                        const key = e.target.value.slice(-1).toLowerCase();
                        if (key && !/^[0-9a-z]$/.test(key)) return;
                        setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, away3: key } }));
                      }}
                      maxLength={1}
                      className="h-6 w-12 text-xs text-center"
                      placeholder="?"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button data-testid="button-reset-scores" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, homeScore: 0, awayScore: 0 }))} className="flex-1">Reset</Button>
            <Button
              data-testid="button-swap-teams"
              size="sm"
              variant="outline"
              onClick={() => setState(prev => ({
                ...prev,
                homeTeam: prev.awayTeam,
                awayTeam: prev.homeTeam,
                homeRoster: prev.awayRoster,
                awayRoster: prev.homeRoster,
                homeScore: prev.awayScore,
                awayScore: prev.homeScore,
                possession: prev.possession === "home" ? "away" : "home"
              }))}
              className="flex-1"
            >
              Swap
            </Button>
          </div>
          <Button
            data-testid="button-toggle-possession"
            size="sm"
            variant={state.possession === "home" ? "default" : "secondary"}
            onClick={() => {
              setState(prev => {
                const newPossession = prev.possession === "home" ? "away" : "home";
                const newTeam = newPossession === "home" ? prev.homeTeam : prev.awayTeam;
                logEvent("possession", `Possession: ${newTeam}`);
                playPossessionSound();
                const updates: Partial<GameState> = { possession: newPossession };
                
                if (prev.sport === "basketball") {
                  updates.shotClockTime = 24.0;
                } else if (prev.sport === "football") {
                  updates.playClockTime = 40;
                }
                
                return { ...prev, ...updates };
              });
            }}
            className="w-full"
          >
            {state.possession === "home" ? state.homeTeam : state.awayTeam} {state.sport === "baseball" ? "AT-BAT" : "BALL"}
          </Button>
        </Card>

        {/* Game Clock */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Game Clock</Label>
          <div data-testid="text-game-clock" className="text-3xl font-mono font-bold text-center">{formatTime(state.gameClockTime)}</div>
          <div className="flex gap-2">
            <Button data-testid="button-clock-start" size="sm" variant="default" onClick={() => setState(prev => ({ ...prev, gameClockRunning: true }))} className="flex-1">Start</Button>
            <Button data-testid="button-clock-stop" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, gameClockRunning: false }))} className="flex-1">Stop</Button>
            <Button data-testid="button-clock-reset" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, gameClockTime: 720 }))} className="flex-1">Reset</Button>
          </div>
          <div className="flex gap-1">
            {([0.75, 1.0, 1.25, 1.5] as SpeedMultiplier[]).map(speed => (
              <Button
                key={speed}
                data-testid={`button-speed-${speed}`}
                size="sm"
                variant={state.speedMultiplier === speed ? "default" : "outline"}
                onClick={() => setState(prev => ({ ...prev, speedMultiplier: speed }))}
                className="flex-1"
              >
                ×{speed}
              </Button>
            ))}
          </div>
        </Card>

        {/* Sport Timers */}
        {state.sport === "basketball" && (
          <>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Shot Clock</Label>
              <div data-testid="text-shot-clock" className="text-3xl font-mono font-bold text-center">{state.shotClockTime.toFixed(1)}</div>
            </Card>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quarter</Label>
              <div className="flex items-center justify-center gap-2">
                <Button data-testid="button-basketball-quarter-down" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, basketballQuarter: Math.max(1, prev.basketballQuarter - 1) }))}>Q−</Button>
                <span data-testid="text-basketball-quarter" className="px-4 py-2 bg-muted rounded font-mono text-xl font-bold">{state.basketballQuarter}</span>
                <Button data-testid="button-basketball-quarter-up" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, basketballQuarter: Math.min(4, prev.basketballQuarter + 1) }))}>Q+</Button>
              </div>
            </Card>
          </>
        )}

        {state.sport === "football" && (
          <>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Play Clock</Label>
              <div data-testid="text-play-clock" className="text-3xl font-mono font-bold text-center">{Math.floor(state.playClockTime)}</div>
              <div className="flex gap-2">
                <Button data-testid="button-play-reset" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, playClockTime: 40 }))} className="flex-1">Reset 40</Button>
                <Button data-testid="button-play-delay" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, playClockTime: prev.playClockTime + 5 }))} className="flex-1">Delay +5</Button>
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Football Details</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Quarter</span>
                <div className="flex gap-1">
                  <Button data-testid="button-quarter-down" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, quarter: Math.max(1, prev.quarter - 1) }))}>Q−</Button>
                  <span data-testid="text-quarter" className="px-3 py-1 bg-muted rounded font-mono">{state.quarter}</span>
                  <Button data-testid="button-quarter-up" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, quarter: Math.min(4, prev.quarter + 1) }))}>Q+</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Down</span>
                <div className="flex gap-1">
                  <Button data-testid="button-down-down" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, down: Math.max(1, prev.down - 1) }))}>−</Button>
                  <span data-testid="text-down" className="px-3 py-1 bg-muted rounded font-mono">{state.down}</span>
                  <Button data-testid="button-down-up" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, down: Math.min(4, prev.down + 1) }))}>+</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">To Go</span>
                <div className="flex gap-1">
                  <Button data-testid="button-togo-down" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, toGo: Math.max(0, prev.toGo - 5) }))}>−5</Button>
                  <span data-testid="text-togo" className="px-3 py-1 bg-muted rounded font-mono">{state.toGo}</span>
                  <Button data-testid="button-togo-up" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, toGo: prev.toGo + 5 }))}>+5</Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {state.sport === "baseball" && (
          <>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Count</Label>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">BALLS</div>
                  <div data-testid="text-balls" className="text-2xl font-mono font-bold">{state.balls}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">STRIKES</div>
                  <div data-testid="text-strikes" className="text-2xl font-mono font-bold">{state.strikes}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">OUTS</div>
                  <div data-testid="text-outs" className="text-2xl font-mono font-bold">{state.outs}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  data-testid="button-add-ball"
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => {
                    const newBalls = prev.balls + 1;
                    if (newBalls >= 4) {
                      return { ...prev, balls: 0 };
                    }
                    return { ...prev, balls: newBalls };
                  })}
                >
                  Ball
                </Button>
                <Button
                  data-testid="button-add-strike"
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => {
                    const newStrikes = prev.strikes + 1;
                    if (newStrikes >= 3) {
                      const newOuts = prev.outs + 1;
                      if (newOuts >= 3) {
                        const newHalf = prev.inningHalf === "top" ? "bottom" : "top";
                        const newInning = newHalf === "top" ? prev.inning + 1 : prev.inning;
                        return { ...prev, strikes: 0, balls: 0, outs: 0, inningHalf: newHalf, inning: newInning, runners: { first: "", second: "", third: "" } };
                      }
                      return { ...prev, strikes: 0, balls: 0, outs: newOuts };
                    }
                    return { ...prev, strikes: newStrikes };
                  })}
                >
                  Strike
                </Button>
                <Button
                  data-testid="button-add-out"
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => {
                    const newOuts = prev.outs + 1;
                    if (newOuts >= 3) {
                      const newHalf = prev.inningHalf === "top" ? "bottom" : "top";
                      const newInning = newHalf === "top" ? prev.inning + 1 : prev.inning;
                      return { ...prev, strikes: 0, balls: 0, outs: 0, inningHalf: newHalf, inning: newInning, runners: { first: "", second: "", third: "" } };
                    }
                    return { ...prev, balls: 0, strikes: 0, outs: newOuts };
                  })}
                >
                  Out
                </Button>
              </div>
              <Button data-testid="button-reset-count" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, balls: 0, strikes: 0, outs: 0 }))} className="w-full">Reset Count</Button>
            </Card>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Runners</Label>
              <div className="flex gap-2">
                <Button
                  data-testid="button-advance-1b"
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => {
                    if (!prev.carrierNumber) return prev;
                    const updates: Partial<GameState> = {};
                    const newRunners = { ...prev.runners };
                    
                    if (newRunners.third) {
                      const team = prev.possession === "home" ? "homeScore" : "awayScore";
                      updates[team] = prev[team] + 1;
                    }
                    
                    newRunners.third = newRunners.second;
                    newRunners.second = newRunners.first;
                    newRunners.first = prev.carrierNumber;
                    
                    return { ...prev, ...updates, runners: newRunners };
                  })}
                  className="flex-1"
                >
                  1B
                </Button>
                <Button
                  data-testid="button-advance-2b"
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => {
                    if (!prev.carrierNumber) return prev;
                    const updates: Partial<GameState> = {};
                    const newRunners = { ...prev.runners };
                    
                    let runs = 0;
                    if (newRunners.third) runs++;
                    if (newRunners.second) runs++;
                    
                    if (runs > 0) {
                      const team = prev.possession === "home" ? "homeScore" : "awayScore";
                      updates[team] = prev[team] + runs;
                    }
                    
                    newRunners.third = newRunners.first;
                    newRunners.second = prev.carrierNumber;
                    newRunners.first = "";
                    
                    return { ...prev, ...updates, runners: newRunners };
                  })}
                  className="flex-1"
                >
                  2B
                </Button>
                <Button
                  data-testid="button-advance-3b"
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => {
                    if (!prev.carrierNumber) return prev;
                    const updates: Partial<GameState> = {};
                    const newRunners = { ...prev.runners };
                    
                    let runs = 0;
                    if (newRunners.third) runs++;
                    if (newRunners.second) runs++;
                    if (newRunners.first) runs++;
                    
                    if (runs > 0) {
                      const team = prev.possession === "home" ? "homeScore" : "awayScore";
                      updates[team] = prev[team] + runs;
                    }
                    
                    newRunners.third = prev.carrierNumber;
                    newRunners.second = "";
                    newRunners.first = "";
                    
                    return { ...prev, ...updates, runners: newRunners };
                  })}
                  className="flex-1"
                >
                  3B
                </Button>
              </div>
              <Button data-testid="button-clear-bases" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, runners: { first: "", second: "", third: "" } }))} className="w-full">Clear Bases</Button>
            </Card>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Inning</Label>
              <div className="flex items-center justify-center gap-2">
                <Button 
                  data-testid="button-inning-down" 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setState(prev => ({ ...prev, inning: Math.max(1, prev.inning - 1) }))}
                >
                  −
                </Button>
                <span data-testid="text-inning" className="px-4 py-2 bg-muted rounded font-mono text-xl font-bold">
                  {state.inningHalf === "top" ? "▲" : "▼"} {state.inning}
                </span>
                <Button 
                  data-testid="button-inning-up" 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setState(prev => ({ ...prev, inning: prev.inning + 1 }))}
                >
                  +
                </Button>
              </div>
              <Button
                data-testid="button-toggle-inning-half"
                size="sm"
                variant="outline"
                onClick={() => setState(prev => ({ ...prev, inningHalf: prev.inningHalf === "top" ? "bottom" : "top" }))}
                className="w-full"
              >
                Toggle {state.inningHalf === "top" ? "Bottom" : "Top"}
              </Button>
            </Card>
          </>
        )}

        {/* Ball Controls */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ball Controls</Label>
          <div>
            <Label className="text-xs">Ball Size</Label>
            <Slider
              data-testid="slider-ball-size"
              value={[state.ballSize]}
              onValueChange={([val]) => setState(prev => ({ ...prev, ballSize: val }))}
              min={15}
              max={50}
              step={1}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground text-center mt-1">{state.ballSize}px</div>
          </div>
          <Button
            data-testid="button-toggle-trail"
            size="sm"
            variant={state.ballTrail ? "default" : "outline"}
            onClick={() => {
              setState(prev => ({ ...prev, ballTrail: !prev.ballTrail }));
              if (!state.ballTrail) trailPoints.current = [];
            }}
            className="w-full"
          >
            Trail {state.ballTrail ? "ON" : "OFF"}
          </Button>
        </Card>

        {/* Sound Effects */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sound Effects</Label>
          <Button
            data-testid="button-toggle-sound"
            size="sm"
            variant={soundEnabled ? "default" : "outline"}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-full"
          >
            Sound {soundEnabled ? "ON" : "OFF"}
          </Button>
          <div>
            <Label className="text-xs">Volume</Label>
            <Slider
              data-testid="slider-volume"
              value={[volume]}
              onValueChange={([val]) => setVolume(val)}
              min={0}
              max={1}
              step={0.1}
              className="mt-2"
              disabled={!soundEnabled}
            />
            <div className="text-xs text-muted-foreground text-center mt-1">{(volume * 100).toFixed(0)}%</div>
          </div>
        </Card>

        {/* Camera Controls */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Camera & Zoom</Label>
          <div>
            <Label className="text-xs">Zoom Level</Label>
            <Slider
              data-testid="slider-zoom"
              value={[cameraZoom]}
              onValueChange={([val]) => setCameraZoom(val)}
              min={0.5}
              max={3.0}
              step={0.1}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground text-center mt-1">{cameraZoom.toFixed(1)}x</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              data-testid="button-pan-up"
              size="sm"
              variant="outline"
              onClick={() => setCameraPanY(prev => prev + 50)}
            >
              Pan ↑
            </Button>
            <Button
              data-testid="button-pan-down"
              size="sm"
              variant="outline"
              onClick={() => setCameraPanY(prev => prev - 50)}
            >
              Pan ↓
            </Button>
            <Button
              data-testid="button-pan-left"
              size="sm"
              variant="outline"
              onClick={() => setCameraPanX(prev => prev + 50)}
            >
              Pan ←
            </Button>
            <Button
              data-testid="button-pan-right"
              size="sm"
              variant="outline"
              onClick={() => setCameraPanX(prev => prev - 50)}
            >
              Pan →
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                data-testid="button-preset-center"
                size="sm"
                variant="outline"
                onClick={() => applyCameraPreset("center")}
              >
                Center
              </Button>
              <Button
                data-testid="button-preset-wide"
                size="sm"
                variant="outline"
                onClick={() => applyCameraPreset("wide")}
              >
                Wide
              </Button>
              <Button
                data-testid="button-preset-goal"
                size="sm"
                variant="outline"
                onClick={() => applyCameraPreset("zoom-goal")}
              >
                {state.sport === "basketball" ? "Goal" : state.sport === "football" ? "Endzone" : "Home"}
              </Button>
              <Button
                data-testid="button-preset-action"
                size="sm"
                variant="outline"
                onClick={() => applyCameraPreset("action")}
              >
                Action
              </Button>
            </div>
          </div>
          <Button
            data-testid="button-reset-camera"
            size="sm"
            variant="default"
            onClick={resetCamera}
            className="w-full"
          >
            Reset View
          </Button>
        </Card>

        {/* Logo */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Home Logo</Label>
          <Input
            data-testid="input-logo-upload"
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleLogoUpload}
          />
          <div>
            <Label className="text-xs">Size</Label>
            <Slider
              data-testid="slider-logo-size"
              value={[state.logoScale]}
              onValueChange={([val]) => setState(prev => ({ ...prev, logoScale: val }))}
              min={0.1}
              max={1.0}
              step={0.05}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground text-center mt-1">{(state.logoScale * 100).toFixed(0)}%</div>
          </div>
          <Button
            data-testid="button-drag-logo"
            size="sm"
            variant={dragLogoMode.current ? "default" : "outline"}
            onClick={() => {
              dragLogoMode.current = !dragLogoMode.current;
              setState(prev => ({ ...prev }));
            }}
            className="w-full"
          >
            Drag Logo {dragLogoMode.current ? "ON" : "OFF"}
          </Button>
          <div className="grid grid-cols-3 gap-1">
            <Button data-testid="button-logo-auto" size="sm" variant="outline" onClick={() => setLogoPreset("auto")}>Auto</Button>
            <Button data-testid="button-logo-tl" size="sm" variant="outline" onClick={() => setLogoPreset("top-left")}>TL</Button>
            <Button data-testid="button-logo-tr" size="sm" variant="outline" onClick={() => setLogoPreset("top-right")}>TR</Button>
            <Button data-testid="button-logo-center" size="sm" variant="outline" onClick={() => setLogoPreset("center")}>C</Button>
            <Button data-testid="button-logo-bl" size="sm" variant="outline" onClick={() => setLogoPreset("bottom-left")}>BL</Button>
            <Button data-testid="button-logo-br" size="sm" variant="outline" onClick={() => setLogoPreset("bottom-right")}>BR</Button>
          </div>
          <Button
            data-testid="button-remove-logo"
            size="sm"
            variant="destructive"
            onClick={() => {
              setState(prev => ({ ...prev, logoX: null, logoY: null, logoDataURL: null }));
              setLogoImage(null);
              dragLogoMode.current = false;
            }}
            disabled={!state.logoDataURL}
            className="w-full"
          >
            Remove Logo
          </Button>
        </Card>

        {/* Football Endzone Logos */}
        {state.sport === "football" && (
          <>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Home Endzone Logo</Label>
              <Input
                data-testid="input-home-endzone-logo"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleHomeEndzoneLogoUpload}
              />
              <div>
                <Label className="text-xs">Size</Label>
                <Slider
                  data-testid="slider-home-endzone-size"
                  value={[state.homeEndzoneLogoScale]}
                  onValueChange={([val]) => setState(prev => ({ ...prev, homeEndzoneLogoScale: val }))}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground text-center mt-1">{(state.homeEndzoneLogoScale * 100).toFixed(0)}%</div>
              </div>
              <Button
                data-testid="button-remove-home-endzone"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setState(prev => ({ ...prev, homeEndzoneLogoDataURL: null }));
                  setHomeEndzoneLogoImage(null);
                }}
                disabled={!state.homeEndzoneLogoDataURL}
                className="w-full"
              >
                Remove
              </Button>
            </Card>

            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Away Endzone Logo</Label>
              <Input
                data-testid="input-away-endzone-logo"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleAwayEndzoneLogoUpload}
              />
              <div>
                <Label className="text-xs">Size</Label>
                <Slider
                  data-testid="slider-away-endzone-size"
                  value={[state.awayEndzoneLogoScale]}
                  onValueChange={([val]) => setState(prev => ({ ...prev, awayEndzoneLogoScale: val }))}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground text-center mt-1">{(state.awayEndzoneLogoScale * 100).toFixed(0)}%</div>
              </div>
              <Button
                data-testid="button-remove-away-endzone"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setState(prev => ({ ...prev, awayEndzoneLogoDataURL: null }));
                  setAwayEndzoneLogoImage(null);
                }}
                disabled={!state.awayEndzoneLogoDataURL}
                className="w-full"
              >
                Remove
              </Button>
            </Card>
          </>
        )}

        {/* Game Stats */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Game Stats</Label>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowStats(!showStats)}
              data-testid="button-toggle-stats"
            >
              {showStats ? "Hide" : "Show"}
            </Button>
          </div>
          {showStats && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Possession Time</div>
                  <div className="font-mono text-primary">{state.homeTeam}</div>
                  <div className="font-display font-bold">{formatTime(gameStats.homePossessionTime)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Possession Time</div>
                  <div className="font-mono text-secondary">{state.awayTeam}</div>
                  <div className="font-display font-bold">{formatTime(gameStats.awayPossessionTime)}</div>
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="text-xs text-muted-foreground uppercase mb-1">Current Run</div>
                <div className="font-display font-bold text-accent">
                  {gameStats.consecutivePoints > 0 && `${gameStats.lastScoreTeam === "home" ? state.homeTeam : state.awayTeam}: ${gameStats.consecutivePoints} pts`}
                  {gameStats.consecutivePoints === 0 && "No active run"}
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="text-xs text-muted-foreground uppercase mb-1">Scoring Summary</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">{state.homeTeam}</span>
                    <span className="font-display">{gameStats.homeScores.length} scores</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">{state.awayTeam}</span>
                    <span className="font-display">{gameStats.awayScores.length} scores</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Play History */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Play History</Label>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
            >
              {showHistory ? "Hide" : "Show"}
            </Button>
          </div>
          {showHistory && (
            <div className="max-h-48 overflow-y-auto space-y-1" data-testid="history-list">
              {playHistory.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No events yet</div>
              ) : (
                playHistory.map(event => (
                  <div key={event.id} className="text-xs p-2 bg-muted rounded hover-elevate" data-testid={`history-item-${event.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-muted-foreground">{formatEventTime(event.timestamp)}</span>
                      <span className="flex-1 truncate">{event.description}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {playHistory.length > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setPlayHistory([])}
              data-testid="button-clear-history"
              className="w-full"
            >
              Clear History
            </Button>
          )}
        </Card>

        {/* Session */}
        <Card className="p-4 space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Session</Label>
          <Button data-testid="button-save-session" size="sm" variant="default" onClick={saveSession} className="w-full">Save Session</Button>
          <Button data-testid="button-load-session" size="sm" variant="outline" onClick={loadSession} className="w-full">Load Session</Button>
          <Button data-testid="button-new-session" size="sm" variant="outline" onClick={newSession} className="w-full">New Session</Button>
          <div className="border-t pt-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Export</Label>
            <div className="space-y-2">
              <Button 
                data-testid="button-export-json" 
                size="sm" 
                variant="outline" 
                onClick={exportSessionJSON} 
                className="w-full"
              >
                Export Session (JSON)
              </Button>
              <Button 
                data-testid="button-export-csv" 
                size="sm" 
                variant="outline" 
                onClick={exportHistoryCSV} 
                className="w-full"
                disabled={playHistory.length === 0}
              >
                Export History (CSV)
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Stage */}
      <div className="flex-1 flex flex-col">
        {/* Top HUD */}
        <div className="h-16 bg-card/90 backdrop-blur-md border-b border-card-border flex items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {state.sport === "basketball" && "🏀"}
              {state.sport === "football" && "🏈"}
              {state.sport === "baseball" && "⚾"}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-3 pulse-scale"></div>
              <span className="text-xs font-semibold uppercase tracking-wide text-chart-3">LIVE</span>
            </div>
          </div>
          
          {/* Scoreboard */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`text-center ${state.possession === "home" ? "opacity-100" : "opacity-50"}`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{state.homeTeam}</div>
                <div data-testid="text-home-score" className="text-3xl font-bold font-mono">{state.homeScore}</div>
              </div>
              <div className="text-2xl text-muted-foreground">-</div>
              <div className={`text-center ${state.possession === "away" ? "opacity-100" : "opacity-50"}`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{state.awayTeam}</div>
                <div data-testid="text-away-score" className="text-3xl font-bold font-mono">{state.awayScore}</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-mono">
              {state.sport === "basketball" && `Q${state.basketballQuarter}`}
              {state.sport === "football" && `Q${state.quarter}`}
              {state.sport === "baseball" && `${state.inningHalf === "top" ? "▲" : "▼"} ${state.inning}`}
            </div>
            <div className="text-xl font-mono font-bold">{formatTime(state.gameClockTime)}</div>
            <div className="text-sm font-mono px-3 py-1 bg-accent/20 rounded-full border border-accent">
              {state.sport === "basketball" && `${state.shotClockTime.toFixed(1)}s`}
              {state.sport === "football" && `${state.down}${["st", "nd", "rd", "th"][state.down - 1] || "th"} & ${state.toGo}`}
              {state.sport === "baseball" && `${state.balls}-${state.strikes} ${state.outs} OUT`}
            </div>
          </div>
        </div>

        {/* Canvas Stage */}
        <div className="flex-1 flex items-center justify-center p-4 bg-background">
          <div className="w-full max-w-[1600px] aspect-video">
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              className="w-full h-full border border-card-border rounded-lg shadow-lg"
              style={{ cursor: isDraggingBall.current || isDraggingLogo.current ? "grabbing" : "default" }}
            />
          </div>
        </div>

        {/* Bottom Hints */}
        <div className="h-12 bg-card/90 backdrop-blur-md border-t border-card-border flex items-center justify-center px-6">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold">Arrows:</span> Move Ball &nbsp;|&nbsp;
            <span className="font-semibold">Shift:</span> Sprint &nbsp;|&nbsp;
            <span className="font-semibold">Space:</span> Pulse &nbsp;|&nbsp;
            <span className="font-semibold">Mouse:</span> Click & Drag
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Playback</DialogTitle>
            <DialogDescription>Playing video clip. Click the button below or press ESC to return to game.</DialogDescription>
          </DialogHeader>
          {playingVideo && (
            <div className="space-y-4">
              <video
                src={playingVideo}
                controls
                autoPlay
                className="w-full rounded-lg"
                data-testid="video-player"
                onEnded={() => setPlayingVideo(null)}
              />
              <div className="flex justify-end">
                <Button
                  data-testid="button-close-video"
                  size="sm"
                  variant="outline"
                  onClick={() => setPlayingVideo(null)}
                >
                  Return to Game
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
