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
import { UpgradeModal } from "@/components/upgrade-modal";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { Lock, LogOut, Settings, BarChart3, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import basketballCourtImage from "@assets/NBA-Court-Color_1760845084027.png";
import footballFieldImage from "@assets/fb_1760845569955.webp";
import baseballFieldImage from "@assets/Sport-Colored-Baseball-Field-Template_1760845569954.png";

type Sport = "basketball" | "football" | "baseball";
type SpeedMultiplier = 0.75 | 1.0 | 1.25 | 1.5;

interface PlayerHotkey {
  jersey: string;
  name: string;
  hotkey: string;
  imageDataURL?: string;
}

interface ShotEvent {
  id: string;
  x: number;
  y: number;
  made: boolean;
  playerName: string;
  playerJersey: string;
  team: "home" | "away";
  timestamp: number;
  isFreeThrow?: boolean;
  points?: number;
}

interface PassEvent {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  completed: boolean;
  playerName: string;
  playerJersey: string;
  team: "home" | "away";
  distance: number;
  timestamp: number;
}

interface FootballPlay {
  id: string;
  type: "rush" | "pass";
  yards: number;
  playerName: string;
  playerJersey: string;
  team: "home" | "away";
  timestamp: number;
}

interface BaseballHit {
  id: string;
  x: number;
  y: number;
  made: boolean; // true = hit, false = strike
  playerName: string;
  playerJersey: string;
  team: "home" | "away";
  timestamp: number;
}

interface HitEvent {
  id: string;
  x: number;
  y: number;
  result: "single" | "double" | "triple" | "hr" | "out";
  playerName: string;
  playerJersey: string;
  team: "home" | "away";
  timestamp: number;
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
  atBatName: string;
  atBatNumber: string;
  runners: { 
    first: { name: string; number: string } | null; 
    second: { name: string; number: string } | null; 
    third: { name: string; number: string } | null; 
  };
  
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
  
  // Soundboard
  soundSlots: Array<{ name: string; dataURL: string } | null>;
  
  // Shot tracking
  basketballShots: ShotEvent[];
  footballPasses: PassEvent[];
  footballPlays: FootballPlay[];
  baseballHits: BaseballHit[];
  
  // Player label scales
  playerLabelScale: number;
  playerImageScale: number;
}

interface PlayEvent {
  id: string;
  timestamp: number;
  type: "score" | "possession" | "period" | "baseball_event" | "football_down" | "play";
  description: string;
  gameState?: Partial<GameState>;
}

export default function Visualizer() {
  const { user, logout } = useAuth();
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
  const planLimits = usePlanLimits();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState("");
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const gamepadRef = useRef<Gamepad | null>(null);
  const lastGamepadButtons = useRef<boolean[]>([]);
  const [canvasFocused, setCanvasFocused] = useState(true);

  const showUpgrade = (featureName: string) => {
    setUpgradeFeatureName(featureName);
    setShowUpgradeModal(true);
  };

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
    atBatName: "",
    atBatNumber: "",
    runners: { first: null, second: null, third: null },
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
    soundSlots: Array(8).fill(null),
    basketballShots: [],
    footballPasses: [],
    footballPlays: [],
    baseballHits: [],
    playerLabelScale: 1.0,
    playerImageScale: 1.0,
  });

  const [homePlayersInput, setHomePlayersInput] = useState("");
  const [awayPlayersInput, setAwayPlayersInput] = useState("");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [homeEndzoneLogoImage, setHomeEndzoneLogoImage] = useState<HTMLImageElement | null>(null);
  const [awayEndzoneLogoImage, setAwayEndzoneLogoImage] = useState<HTMLImageElement | null>(null);
  const [playerImages, setPlayerImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [playHistory, setPlayHistory] = useState<PlayEvent[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [pendingShotLocation, setPendingShotLocation] = useState<{ x: number; y: number } | null>(null);
  const pendingShotLocationRef = useRef<{ x: number; y: number } | null>(null);
  const [pendingPassStart, setPendingPassStart] = useState<{ x: number; y: number } | null>(null);
  const [waitingForShotResult, setWaitingForShotResult] = useState(false);
  const waitingForShotResultRef = useRef(false);
  const [isFreeThrowMode, setIsFreeThrowMode] = useState(false);
  const isFreeThrowModeRef = useRef(false);
  const [currentPlayYards, setCurrentPlayYards] = useState(0);
  const currentPlayYardsRef = useRef(0);
  const playStartBallX = useRef<number>(960); // Track starting ball X position for yardage calculation
  const lastBallX = useRef<number>(960); // Track last ball X to detect actual movement
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<"home" | "away">("home");
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>("all");
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
  const basketballCourtImageRef = useRef<HTMLImageElement | null>(null);
  const footballFieldImageRef = useRef<HTMLImageElement | null>(null);
  const baseballFieldImageRef = useRef<HTMLImageElement | null>(null);

  // Sync currentPlayYards ref with state
  useEffect(() => {
    currentPlayYardsRef.current = currentPlayYards;
  }, [currentPlayYards]);
  
  // Sync pendingShotLocation ref with state
  useEffect(() => {
    pendingShotLocationRef.current = pendingShotLocation;
  }, [pendingShotLocation]);
  
  // Sync waitingForShotResult ref with state
  useEffect(() => {
    waitingForShotResultRef.current = waitingForShotResult;
  }, [waitingForShotResult]);
  
  // Sync isFreeThrowMode ref with state
  useEffect(() => {
    isFreeThrowModeRef.current = isFreeThrowMode;
  }, [isFreeThrowMode]);

  // Load sport field/court background images
  useEffect(() => {
    const basketballImg = new Image();
    basketballImg.onload = () => {
      basketballCourtImageRef.current = basketballImg;
    };
    basketballImg.src = basketballCourtImage;

    const footballImg = new Image();
    footballImg.onload = () => {
      footballFieldImageRef.current = footballImg;
    };
    footballImg.src = footballFieldImage;

    const baseballImg = new Image();
    baseballImg.onload = () => {
      baseballFieldImageRef.current = baseballImg;
    };
    baseballImg.src = baseballFieldImage;
  }, []);

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
          soundSlots: data.soundSlots || Array(8).fill(null),
          playerHotkeys: data.playerHotkeys || [],
          scoreHotkeys: data.scoreHotkeys || {
            home1: "",
            home2: "",
            home3: "",
            away1: "",
            away2: "",
            away3: "",
          },
          playerLabelScale: data.playerLabelScale ?? 1.0,
          playerImageScale: data.playerImageScale ?? 1.0,
          carrierName: data.carrierName || "",
        });
        
        // Sync ball physics refs
        ballPhysics.current.x = data.ballX;
        ballPhysics.current.y = data.ballY;
        ballPhysics.current.velX = data.ballVelX;
        ballPhysics.current.velY = data.ballVelY;
        ballPhysics.current.angle = data.ballAngle;
        
        // Initialize yardage tracking refs
        playStartBallX.current = data.ballX;
        lastBallX.current = data.ballX;
        
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
      
      // Initialize yardage tracking refs
      playStartBallX.current = state.ballX;
      lastBallX.current = state.ballX;
    }
  }, []);

  // Load sport from user's selection
  useEffect(() => {
    if (user?.selectedSport) {
      setState(prev => ({
        ...prev,
        sport: user.selectedSport as Sport
      }));
    }
  }, [user?.selectedSport]);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load player images when playerHotkeys change
  useEffect(() => {
    const newPlayerImages = new Map<string, HTMLImageElement>();
    state.playerHotkeys.forEach(hotkey => {
      if (hotkey.imageDataURL) {
        const img = new Image();
        img.onload = () => {
          setPlayerImages(prev => new Map(prev).set(hotkey.jersey, img));
        };
        img.src = hotkey.imageDataURL;
      }
    });
  }, [state.playerHotkeys]);

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
      setState(prev => {
        const updates: Partial<GameState> = {
          ballX: ballPhysics.current.x,
          ballY: ballPhysics.current.y,
          ballVelX: ballPhysics.current.velX,
          ballVelY: ballPhysics.current.velY,
          ballAngle: ballPhysics.current.angle
        };
        
        return { ...prev, ...updates };
      });
      
      // Football: Auto-calculate yardage from ball movement (1920px = 120 yards, ~16px/yard)
      // Only update if ball has actually moved (to preserve manual adjustments)
      // HOME team gains + yards moving right (toward away endzone)
      // AWAY team gains + yards moving left (toward home endzone)
      if (stateRef.current.sport === "football") {
        const currentBallX = ballPhysics.current.x;
        const ballMoved = Math.abs(currentBallX - lastBallX.current) > 1; // Threshold of 1px to avoid floating point issues
        
        if (ballMoved) {
          const deltaX = currentBallX - playStartBallX.current;
          const directionMultiplier = stateRef.current.possession === "away" ? -1 : 1;
          const yardsGained = Math.round((deltaX * directionMultiplier) / 16);
          setCurrentPlayYards(yardsGained);
          lastBallX.current = currentBallX;
        }
      }
    }, 100); // Sync every 100ms for responsive yardage updates
    
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
    // Check if user can switch sports
    if (!planLimits.canSwitchSports && state.sport !== newSport) {
      showUpgrade("Switch Sports");
      toast({
        title: "Upgrade Required",
        description: `${planLimits.planName} plan is locked to one sport. Upgrade to switch between sports.`,
        variant: "destructive",
      });
      return;
    }

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
    
    // Draw court image if loaded
    if (basketballCourtImageRef.current) {
      ctx.drawImage(basketballCourtImageRef.current, 0, 0, w, h);
    } else {
      // Fallback: Wood court gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#c19a6b");
      gradient.addColorStop(1, "#a67c52");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
    
    // Basketball hoops (draw on top of image, aligned with court image hoops)
    const drawHoop = (x: number) => {
      // Rim only, no net - smaller size
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, 540, 20, 0, Math.PI * 2);
      ctx.stroke();
    };
    
    drawHoop(230);  // Left hoop - aligned with backboard
    drawHoop(1690); // Right hoop - aligned with backboard
  };

  const drawFootballField = (ctx: CanvasRenderingContext2D) => {
    const w = 1920, h = 1080;
    
    // Draw field image if loaded
    if (footballFieldImageRef.current) {
      ctx.drawImage(footballFieldImageRef.current, 0, 0, w, h);
    } else {
      // Fallback: Green field
      ctx.fillStyle = "#2d5016";
      ctx.fillRect(0, 0, w, h);
    }
    
    // Field goals at endzones (draw on top)
    const drawFieldGoal = (x: number) => {
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 6;
      
      // Uprights - much shorter, fits between white lines
      ctx.beginPath();
      ctx.moveTo(x, 350);
      ctx.lineTo(x, 250);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, 730);
      ctx.lineTo(x, 830);
      ctx.stroke();
      
      // Crossbar - short to match uprights
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, 350);
      ctx.lineTo(x, 730);
      ctx.stroke();
    };
    
    drawFieldGoal(100);  // Left endzone
    drawFieldGoal(1820); // Right endzone
    
    // Draw team names in endzones
    ctx.save();
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Left endzone - HOME (rotated vertically)
    ctx.save();
    ctx.translate(150, 540);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 3;
    ctx.strokeText("TOUCHDOWN", 0, 0);
    ctx.fillText("TOUCHDOWN", 0, 0);
    ctx.restore();
    
    // Right endzone - AWAY (rotated vertically)
    ctx.save();
    ctx.translate(1770, 540);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 3;
    ctx.strokeText("TOUCHDOWN", 0, 0);
    ctx.fillText("TOUCHDOWN", 0, 0);
    ctx.restore();
    
    ctx.restore();
  };

  const drawBaseballField = (ctx: CanvasRenderingContext2D) => {
    const w = 1920, h = 1080;
    
    // Draw field image if loaded
    if (baseballFieldImageRef.current) {
      ctx.drawImage(baseballFieldImageRef.current, 0, 0, w, h);
    } else {
      // Fallback: Green outfield
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
    }
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
    
    // Carrier label with player image
    if (carrierNumber) {
      const hasName = state.carrierName && state.carrierName.trim() !== "";
      const playerImg = playerImages.get(carrierNumber);
      const hasImage = !!playerImg;
      
      // Apply scales
      const fontSize = 16 * state.playerLabelScale;
      const imageSize = 80 * state.playerImageScale;
      const labelHeight = hasName ? 50 * state.playerLabelScale : 24 * state.playerLabelScale;
      const labelWidth = hasImage ? 
        Math.max(150 * state.playerLabelScale, (hasName ? state.carrierName.length * 10 * state.playerLabelScale : 50 * state.playerLabelScale) + imageSize + 10) : 
        (hasName ? Math.max(100 * state.playerLabelScale, state.carrierName.length * 10 * state.playerLabelScale) : 50 * state.playerLabelScale);
      
      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(ballX - labelWidth/2, ballY + 30, labelWidth, labelHeight);
      
      // Player image (left side of label)
      if (hasImage && playerImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ballX - labelWidth/2 + imageSize/2 + 5, ballY + 30 + labelHeight/2, imageSize/2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          playerImg,
          ballX - labelWidth/2 + 5,
          ballY + 30 + (labelHeight - imageSize)/2,
          imageSize,
          imageSize
        );
        ctx.restore();
      }
      
      // Text (shifted right if image exists)
      const textX = hasImage ? ballX + 20 * state.playerLabelScale : ballX;
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${fontSize}px 'JetBrains Mono'`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${carrierNumber}`, textX, ballY + (hasName ? 42 * state.playerLabelScale : 42 * state.playerLabelScale));
      
      if (hasName) {
        ctx.font = `500 ${fontSize}px 'JetBrains Mono'`;
        ctx.fillText(state.carrierName, textX, ballY + 62 * state.playerLabelScale);
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
    const { runners, atBatName, atBatNumber } = state;
    
    // Base positions - CLOSER to home plate, matching white squares on field
    // Home(960,900) → bases much closer
    const bases = [
      { x: 1280, y: 695, runner: runners.first, label: "1B" },  // Right side - further right
      { x: 960, y: 520, runner: runners.second, label: "2B" },  // Top - on base
      { x: 640, y: 695, runner: runners.third, label: "3B" },   // Left side - further left
    ];
    
    // Draw runners on bases
    bases.forEach(base => {
      if (base.runner) {
        ctx.fillStyle = "rgba(234, 179, 8, 0.9)";
        ctx.beginPath();
        ctx.arc(base.x, base.y - 50, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#000000";
        ctx.font = "700 16px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`#${base.runner.number}`, base.x, base.y - 50);
        
        // Draw name below the circle
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 12px 'JetBrains Mono'";
        ctx.fillText(base.runner.name, base.x, base.y - 25);
      }
    });
    
    // Draw "AT BAT" indicator near home plate if someone is at bat
    if (atBatName) {
      const homeX = 960;
      const homeY = 900;
      
      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      ctx.beginPath();
      ctx.arc(homeX, homeY - 60, 22, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 16px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${atBatNumber}`, homeX, homeY - 60);
      
      // Draw name and "AT BAT" label
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 12px 'JetBrains Mono'";
      ctx.fillText(atBatName, homeX, homeY - 35);
      ctx.font = "700 10px 'JetBrains Mono'";
      ctx.fillStyle = "rgba(239, 68, 68, 1)";
      ctx.fillText("AT BAT", homeX, homeY - 20);
    }
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

  // Gamepad Detection & Polling
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      gamepadRef.current = e.gamepad;
      setGamepadConnected(true);
      toast({ description: `Controller Connected: ${e.gamepad.id}` });
    };

    const handleGamepadDisconnected = () => {
      gamepadRef.current = null;
      setGamepadConnected(false);
      toast({ description: "Controller Disconnected", variant: "destructive" });
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, [toast]);

  // Gamepad Polling Loop
  useEffect(() => {
    if (!gamepadConnected) return;

    let animationId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[0]; // Use first connected controller
      
      if (!gamepad) {
        animationId = requestAnimationFrame(pollGamepad);
        return;
      }

      // Standard gamepad mapping (Xbox/PlayStation compatible)
      const buttons = gamepad.buttons;
      const axes = gamepad.axes;

      // D-Pad / Left Analog Stick → Move Ball
      const deadzone = 0.15;
      const moveSpeed = 8;
      const sprintSpeed = 16;
      
      // Right Trigger (RT/R2) held = sprint (only if held, not just pressed)
      const rtWasPressed = lastGamepadButtons.current[7];
      const rtIsPressed = buttons[7]?.pressed;
      const rtHeld = rtIsPressed && rtWasPressed; // Was pressed last frame AND this frame
      const speed = rtHeld ? sprintSpeed : moveSpeed;

      // Analog stick (axes[0] = left/right, axes[1] = up/down)
      if (Math.abs(axes[0]) > deadzone || Math.abs(axes[1]) > deadzone) {
        ballPhysics.current.x += axes[0] * speed;
        ballPhysics.current.y += axes[1] * speed;
        ballPhysics.current.x = Math.max(0, Math.min(1920, ballPhysics.current.x));
        ballPhysics.current.y = Math.max(0, Math.min(1080, ballPhysics.current.y));
      }

      // D-Pad (buttons 12-15)
      if (buttons[12]?.pressed) ballPhysics.current.y = Math.max(0, ballPhysics.current.y - speed); // Up
      if (buttons[13]?.pressed) ballPhysics.current.y = Math.min(1080, ballPhysics.current.y + speed); // Down
      if (buttons[14]?.pressed) ballPhysics.current.x = Math.max(0, ballPhysics.current.x - speed); // Left
      if (buttons[15]?.pressed) ballPhysics.current.x = Math.min(1920, ballPhysics.current.x + speed); // Right

      // Sync ball physics to state periodically
      setState(prev => ({
        ...prev,
        ballX: ballPhysics.current.x,
        ballY: ballPhysics.current.y
      }));

      // Button Actions (detect press, not hold)
      const wasPressed = (index: number) => lastGamepadButtons.current[index];
      const isPressed = (index: number) => buttons[index]?.pressed;
      const justPressed = (index: number) => isPressed(index) && !wasPressed(index);

      // A Button (0) → Pulse Ball / Free Throw Mode
      if (justPressed(0)) {
        pulseRing.current = { active: true, radius: 30, alpha: 1 };
        if (stateRef.current.sport === "basketball") {
          setIsFreeThrowMode(true);
          toast({ description: "Free Throw Mode - Next shot worth 1 point" });
        }
      }

      // B Button (1) → Cycle Ball Carrier / At Bat
      if (justPressed(1)) {
        if (stateRef.current.sport === "baseball") {
          // Baseball: Cycle "at bat" player (not ball carrier)
          const currentIndex = stateRef.current.playerHotkeys.findIndex(
            h => h.jersey === stateRef.current.atBatNumber
          );
          const nextIndex = (currentIndex + 1) % stateRef.current.playerHotkeys.length;
          const nextPlayer = stateRef.current.playerHotkeys[nextIndex];
          if (nextPlayer) {
            setState(prev => ({
              ...prev,
              atBatNumber: nextPlayer.jersey,
              atBatName: nextPlayer.name
            }));
            toast({ description: `${nextPlayer.name} #${nextPlayer.jersey} at bat` });
          }
        } else {
          // Basketball/Football: Cycle ball carrier
          const currentIndex = stateRef.current.playerHotkeys.findIndex(
            h => h.jersey === stateRef.current.carrierNumber
          );
          const nextIndex = (currentIndex + 1) % stateRef.current.playerHotkeys.length;
          const nextPlayer = stateRef.current.playerHotkeys[nextIndex];
          if (nextPlayer) {
            setState(prev => ({
              ...prev,
              carrierNumber: nextPlayer.jersey,
              carrierName: nextPlayer.name
            }));
            toast({ description: `${nextPlayer.name} #${nextPlayer.jersey} set as carrier` });
          }
        }
      }

      // RT (Right Trigger, button 7) → Shoot/Log Play (Step 1: Capture location)
      if (justPressed(7) && !waitingForShotResultRef.current) {
        setWaitingForShotResult(true);
        const ballX = ballPhysics.current.x;
        const ballY = ballPhysics.current.y;
        setPendingShotLocation({ x: ballX, y: ballY });
        
        if (stateRef.current.sport === "basketball") {
          toast({ description: "Shot ready! Press Y (make) or X (miss)" });
        } else if (stateRef.current.sport === "football") {
          toast({ description: "Play ready! Press Y (rush) or X (pass)" });
        } else if (stateRef.current.sport === "baseball") {
          toast({ description: "Ready to log! Press Y (hit) or X (strike)" });
        }
      }

      // Y Button (3) → Make/Rush (Step 2: Confirm made shot or rush play)
      if (justPressed(3) && waitingForShotResultRef.current) {
        const currentState = stateRef.current;
        const currentTeam = currentState.possession;
        const ballX = ballPhysics.current.x;
        const ballY = ballPhysics.current.y;
        
        if (currentState.sport === "basketball") {
          const isFT = isFreeThrowModeRef.current;
          const zone = isFT ? { points: 1, zone: "FT" } : detectBasketballZone(ballX, ballY);
          
          const shot: ShotEvent = {
            id: Date.now().toString(),
            x: ballX,
            y: ballY,
            made: true,
            playerName: currentState.carrierName || "Unknown",
            playerJersey: currentState.carrierNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
            isFreeThrow: isFT,
            points: zone.points,
          };
          
          setState(prev => {
            const newShots = [...prev.basketballShots, shot];
            const newScore = (currentTeam === "home" ? prev.homeScore : prev.awayScore) + zone.points;
            
            return {
              ...prev,
              basketballShots: newShots,
              homeScore: currentTeam === "home" ? newScore : prev.homeScore,
              awayScore: currentTeam === "away" ? newScore : prev.awayScore,
            };
          });
          
          // Trigger goal flash
          goalFlash.current = { active: true, team: currentTeam, startTime: performance.now() };
          
          setIsFreeThrowMode(false);
          setWaitingForShotResult(false);
          toast({ description: `${zone.zone} made! +${zone.points} pts for ${currentState.carrierName}` });
        } else if (currentState.sport === "football") {
          // Auto-calculate yards based on ball movement
          let yards = 0;
          if (pendingShotLocationRef.current) {
            const pixelsMoved = ballX - pendingShotLocationRef.current.x;
            yards = Math.round(pixelsMoved / 16);
          }
          
          const play: FootballPlay = {
            id: Date.now().toString(),
            type: "rush",
            yards: currentPlayYardsRef.current,
            playerName: currentState.carrierName || "Unknown",
            playerJersey: currentState.carrierNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
          };
          
          setState(prev => ({
            ...prev,
            footballPlays: [...prev.footballPlays, play]
          }));
          
          setPlayHistory(prev => [{
            id: play.id,
            timestamp: play.timestamp,
            type: "play" as const,
            description: `${currentState.carrierName} rushed for ${currentPlayYardsRef.current > 0 ? '+' : ''}${currentPlayYardsRef.current} yards`
          }, ...prev].slice(0, 100));
          
          // Reset for next play
          playStartBallX.current = ballX;
          lastBallX.current = ballX;
          setCurrentPlayYards(0);
          setPendingShotLocation(null);
          setWaitingForShotResult(false);
          toast({ description: `Rush: ${currentState.carrierName} ${currentPlayYardsRef.current > 0 ? '+' : ''}${currentPlayYardsRef.current} yards` });
        } else if (currentState.sport === "baseball") {
          const hit: BaseballHit = {
            id: Date.now().toString(),
            x: ballX,
            y: ballY,
            made: true,
            playerName: currentState.atBatName || "Unknown",
            playerJersey: currentState.atBatNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
          };
          
          setState(prev => ({
            ...prev,
            baseballHits: [...prev.baseballHits, hit]
          }));
          
          setPlayHistory(prev => [{
            id: hit.id,
            timestamp: hit.timestamp,
            type: "play" as const,
            description: `${currentState.atBatName || "Unknown"} recorded a HIT`
          }, ...prev].slice(0, 100));
          
          setWaitingForShotResult(false);
          toast({ description: `HIT by ${currentState.atBatName || "Unknown"}!` });
        }
      }

      // X Button (2) → Miss/Pass (Step 2: Confirm missed shot or pass play)
      if (justPressed(2) && waitingForShotResultRef.current) {
        const currentState = stateRef.current;
        const currentTeam = currentState.possession;
        const ballX = ballPhysics.current.x;
        const ballY = ballPhysics.current.y;
        
        if (currentState.sport === "basketball") {
          const isFT = isFreeThrowModeRef.current;
          const zone = isFT ? { points: 1, zone: "FT" } : detectBasketballZone(ballX, ballY);
          
          const shot: ShotEvent = {
            id: Date.now().toString(),
            x: ballX,
            y: ballY,
            made: false,
            playerName: currentState.carrierName || "Unknown",
            playerJersey: currentState.carrierNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
            isFreeThrow: isFT,
            points: zone.points,
          };
          
          setState(prev => ({
            ...prev,
            basketballShots: [...prev.basketballShots, shot]
          }));
          
          setIsFreeThrowMode(false);
          setWaitingForShotResult(false);
          toast({ description: `${zone.zone} missed by ${currentState.carrierName}` });
        } else if (currentState.sport === "football") {
          // Auto-calculate yards based on ball movement
          let yards = 0;
          if (pendingShotLocationRef.current) {
            const pixelsMoved = ballX - pendingShotLocationRef.current.x;
            yards = Math.round(pixelsMoved / 16);
          }
          
          const play: FootballPlay = {
            id: Date.now().toString(),
            type: "pass",
            yards: currentPlayYardsRef.current,
            playerName: currentState.carrierName || "Unknown",
            playerJersey: currentState.carrierNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
          };
          
          setState(prev => ({
            ...prev,
            footballPlays: [...prev.footballPlays, play]
          }));
          
          setPlayHistory(prev => [{
            id: play.id,
            timestamp: play.timestamp,
            type: "play" as const,
            description: `${currentState.carrierName} passed for ${currentPlayYardsRef.current > 0 ? '+' : ''}${currentPlayYardsRef.current} yards`
          }, ...prev].slice(0, 100));
          
          // Reset for next play
          playStartBallX.current = ballX;
          lastBallX.current = ballX;
          setCurrentPlayYards(0);
          setPendingShotLocation(null);
          setWaitingForShotResult(false);
          toast({ description: `Pass: ${currentState.carrierName} ${currentPlayYardsRef.current > 0 ? '+' : ''}${currentPlayYardsRef.current} yards` });
        } else if (currentState.sport === "baseball") {
          const hit: BaseballHit = {
            id: Date.now().toString(),
            x: ballX,
            y: ballY,
            made: false,
            playerName: currentState.atBatName || "Unknown",
            playerJersey: currentState.atBatNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
          };
          
          setState(prev => ({
            ...prev,
            baseballHits: [...prev.baseballHits, hit]
          }));
          
          setPlayHistory(prev => [{
            id: hit.id,
            timestamp: hit.timestamp,
            type: "play" as const,
            description: `${currentState.atBatName || "Unknown"} swung and missed (STRIKE)`
          }, ...prev].slice(0, 100));
          
          setWaitingForShotResult(false);
          toast({ description: `STRIKE by ${currentState.atBatName || "Unknown"}` });
        }
      }

      // LT (Left Trigger, button 6) → Start/Stop Shot/Play Clock
      if (justPressed(6)) {
        if (stateRef.current.sport === "basketball") {
          setState(prev => ({ ...prev, shotClockTime: 24 }));
          toast({ description: "Shot clock reset to 24" });
        } else if (stateRef.current.sport === "football") {
          setState(prev => ({ ...prev, playClockTime: 40 }));
          toast({ description: "Play clock reset to 40" });
        }
      }

      // LB (Left Bumper, button 4) → Toggle Game Clock
      if (justPressed(4)) {
        setState(prev => ({ ...prev, gameClockRunning: !prev.gameClockRunning }));
        const status = stateRef.current.gameClockRunning ? "stopped" : "started";
        toast({ description: `Game clock ${status}` });
      }

      // RB (Right Bumper, button 5) → Toggle Possession
      if (justPressed(5)) {
        setState(prev => ({
          ...prev,
          possession: prev.possession === "home" ? "away" : "home"
        }));
        const newTeam = stateRef.current.possession === "home" ? stateRef.current.awayTeam : stateRef.current.homeTeam;
        toast({ description: `Possession: ${newTeam}` });
      }

      // Start Button (9) → (Reserved for future use)
      // Could be used for pausing, menu, etc.

      // Select/Back Button (8) → Cancel shot/play logging
      if (justPressed(8) && waitingForShotResultRef.current) {
        setWaitingForShotResult(false);
        toast({ description: "Shot/play logging cancelled" });
      }

      // Save button states for next frame
      lastGamepadButtons.current = buttons.map(b => b.pressed);

      animationId = requestAnimationFrame(pollGamepad);
    };

    animationId = requestAnimationFrame(pollGamepad);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [gamepadConnected, toast, setState, setPlayHistory, setIsFreeThrowMode, setWaitingForShotResult, setCurrentPlayYards]);

  // Keyboard
  // Helper: Detect basketball shot zone (2pt, 3pt) - FT is only set via explicit mode
  const detectBasketballZone = (x: number, y: number): { points: number; zone: string } => {
    const centerX = 960;
    const centerY = 540;
    
    // 3-point line distance (approximate basketball court proportions)
    // NBA 3-point line is ~23.75 feet from hoop, scaled to our 1920x1080 court
    const hoopX = x < centerX ? 230 : 1690; // Left or right hoop (aligned with backboard)
    const hoopY = centerY;
    const distToHoop = Math.sqrt(Math.pow(x - hoopX, 2) + Math.pow(y - hoopY, 2));
    
    if (distToHoop > 380) {
      return { points: 3, zone: "3PT" };
    }
    
    return { points: 2, zone: "2PT" };
  };

  // Window focus/blur detection
  useEffect(() => {
    const handleWindowFocus = () => setCanvasFocused(true);
    const handleWindowBlur = () => setCanvasFocused(false);
    
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ensure canvas is marked as focused when keyboard is used
      setCanvasFocused(true);
      
      // Arrow keys move ball (baseball now uses panel controls instead of arrow keys)
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        pulseRing.current = { active: true, radius: 30, alpha: 1 };
        // BASKETBALL: Mark next shot as free throw
        if (stateRef.current.sport === "basketball") {
          setIsFreeThrowMode(true);
          toast({ description: "Free Throw Mode - Next shot worth 1 point" });
        }
      }
      if (e.key === "Shift") {
        e.preventDefault();
        // Toggle possession
        setState(prev => ({
          ...prev,
          possession: prev.possession === "home" ? "away" : "home"
        }));
        const newTeam = stateRef.current.possession === "home" ? stateRef.current.awayTeam : stateRef.current.homeTeam;
        toast({ description: `Possession: ${newTeam}` });
        return;
      }
      
      // FOOTBALL YARDAGE: +/- keys adjust yards
      if (stateRef.current.sport === "football") {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setCurrentPlayYards(prev => prev + 5);
          toast({ description: `Yards: ${currentPlayYards + 5}` });
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setCurrentPlayYards(prev => prev - 1);
          toast({ description: `Yards: ${currentPlayYards - 1}` });
          return;
        }
      }
      
      // Check for player hotkeys
      const playerHotkey = stateRef.current.playerHotkeys.find(h => h.hotkey.toLowerCase() === e.key.toLowerCase());
      if (playerHotkey) {
        if (stateRef.current.sport === "baseball") {
          // Baseball: Set as "at bat" player
          setState(prev => ({ 
            ...prev, 
            atBatNumber: playerHotkey.jersey,
            atBatName: playerHotkey.name 
          }));
          toast({ description: `${playerHotkey.name} (#${playerHotkey.jersey}) at bat` });
        } else {
          // Basketball/Football: Set as ball carrier
          setState(prev => ({ 
            ...prev, 
            carrierNumber: playerHotkey.jersey,
            carrierName: playerHotkey.name 
          }));
          toast({ description: `${playerHotkey.name} (#${playerHotkey.jersey}) set as carrier` });
        }
        return;
      }
      
      // TWO-STEP SYSTEM: 
      // Step 1: Right-click ball / RT button / Enter key → Ready to log
      // Step 2: Press Z for made, X for missed, Escape to cancel
      
      // Step 1: Enter key captures current ball location for logging
      if (e.key === "Enter" && !waitingForShotResultRef.current) {
        e.preventDefault();
        const currentState = stateRef.current;
        const canCapture = currentState.sport === "football" || planLimits.canUseShotCharts;
        
        if (canCapture) {
          setPendingShotLocation({ x: ballPhysics.current.x, y: ballPhysics.current.y });
          setWaitingForShotResult(true);
          toast({ 
            description: currentState.sport === "basketball" 
              ? "Ready to log! Press Z (make) or X (miss)" 
              : currentState.sport === "football"
              ? "Ready to log! Press Z (rush) or X (pass)"
              : "Ready to log! Press Z (hit) or X (strike)"
          });
        }
        return;
      }
      
      // Cancel shot logging if Escape pressed
      if (waitingForShotResultRef.current && e.key === "Escape") {
        setWaitingForShotResult(false);
        setPendingShotLocation(null);
        toast({ description: "Shot logging cancelled" });
        return;
      }
      
      // Step 2: User presses Z (made) or X (missed)
      if (waitingForShotResultRef.current && (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "x")) {
        console.log("⌨️ Z/X key pressed while waiting for result:", { key: e.key, waitingForShotResult: waitingForShotResultRef.current, sport: stateRef.current.sport });
        e.preventDefault();
        const made = e.key.toLowerCase() === "z";
        const currentState = stateRef.current;
        const currentTeam = currentState.possession;
        const ballX = ballPhysics.current.x;
        const ballY = ballPhysics.current.y;
        
        // BASKETBALL: Log shot at ball position, auto-calculate points
        if (currentState.sport === "basketball") {
          const isFT = isFreeThrowModeRef.current;
          const zone = isFT ? { points: 1, zone: "FT" } : detectBasketballZone(ballX, ballY);
          
          const shot: ShotEvent = {
            id: Date.now().toString(),
            x: ballX,
            y: ballY,
            made,
            playerName: currentState.carrierName || "Unknown",
            playerJersey: currentState.carrierNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
            isFreeThrow: isFT,
            points: zone.points,
          };
          
          console.log("🏀 Logging basketball shot:", shot);
          
          setState(prev => {
            const newShots = [...prev.basketballShots, shot];
            console.log("Total shots after logging:", newShots.length);
            let newScore = currentTeam === "home" ? prev.homeScore : prev.awayScore;
            
            // Add points if shot was made
            if (made) {
              newScore += zone.points;
            }
            
            return {
              ...prev,
              basketballShots: newShots,
              homeScore: currentTeam === "home" ? newScore : prev.homeScore,
              awayScore: currentTeam === "away" ? newScore : prev.awayScore,
            };
          });
          
          // Trigger goal flash for made shots
          if (made) {
            goalFlash.current = { active: true, team: currentTeam, startTime: performance.now() };
          }
          
          // Reset free throw mode
          setIsFreeThrowMode(false);
          setWaitingForShotResult(false);
          toast({ 
            description: made 
              ? `${zone.zone} made! +${zone.points} pts for ${currentState.carrierName}` 
              : `${zone.zone} missed by ${currentState.carrierName}` 
          });
          return;
        }
        
        // FOOTBALL: Log rush (Z) or pass (X) with auto-calculated yards
        if (currentState.sport === "football") {
          const isRush = e.key.toLowerCase() === "z";
          
          // Auto-calculate yards based on ball movement (120 yards = ~1920px width)
          let yards = 0;
          if (pendingShotLocation) {
            const pixelsMoved = ballX - pendingShotLocation.x;
            // Convert pixels to yards (1920px ≈ 120 yards, so ~16px per yard)
            // Positive movement to the right = positive yards
            yards = Math.round(pixelsMoved / 16);
          }
          
          const play: FootballPlay = {
            id: Date.now().toString(),
            type: isRush ? "rush" : "pass",
            yards,
            playerName: currentState.carrierName || "Unknown",
            playerJersey: currentState.carrierNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
          };
          
          // Save to state
          setState(prev => ({
            ...prev,
            footballPlays: [...prev.footballPlays, play]
          }));
          
          // Add to play history
          setPlayHistory(prev => [{
            id: play.id,
            timestamp: play.timestamp,
            type: "play" as const,
            description: `${currentState.carrierName} ${isRush ? "rushed" : "passed"} for ${yards > 0 ? '+' : ''}${yards} yards`
          }, ...prev].slice(0, 100));
          
          // Reset yards and waiting state
          setCurrentPlayYards(0);
          setPendingShotLocation(null);
          setWaitingForShotResult(false);
          
          toast({ 
            description: `${isRush ? "Rush" : "Pass"}: ${currentState.carrierName} ${yards > 0 ? '+' : ''}${yards} yards` 
          });
          return;
        }
        
        // BASEBALL: Log hit (Z) or strike (X)
        if (currentState.sport === "baseball") {
          const isHit = e.key.toLowerCase() === "z";
          
          const hit: BaseballHit = {
            id: Date.now().toString(),
            x: ballX,
            y: ballY,
            made: isHit,
            playerName: currentState.atBatName || "Unknown",
            playerJersey: currentState.atBatNumber || "00",
            team: currentTeam,
            timestamp: Date.now(),
          };
          
          console.log(`⚾ Logging baseball ${isHit ? "hit" : "strike"}:`, hit);
          
          // Save to state
          setState(prev => ({
            ...prev,
            baseballHits: [...prev.baseballHits, hit]
          }));
          
          // Add to play history
          setPlayHistory(prev => [{
            id: hit.id,
            timestamp: hit.timestamp,
            type: "play" as const,
            description: isHit 
              ? `${currentState.atBatName || "Unknown"} recorded a HIT` 
              : `${currentState.atBatName || "Unknown"} swung and missed (STRIKE)`
          }, ...prev].slice(0, 100));
          
          // Reset waiting state
          setWaitingForShotResult(false);
          
          toast({ 
            description: isHit 
              ? `HIT by ${currentState.atBatName || "Unknown"}!` 
              : `STRIKE by ${currentState.atBatName || "Unknown"}` 
          });
          return;
        }
      }
      
      // Check for score hotkeys
      const triggerScore = (team: "home" | "away", points: number) => {
        setState(prev => {
          const newScore = (team === "home" ? prev.homeScore : prev.awayScore) + points;
          const teamName = team === "home" ? prev.homeTeam : prev.awayTeam;
          
          // Track shot/pass/hit if pending location exists
          let updatedState = { ...prev };
          
          if (planLimits.canUseShotCharts && pendingShotLocation && prev.sport === "basketball") {
            const shot: ShotEvent = {
              id: Date.now().toString(),
              x: pendingShotLocation.x,
              y: pendingShotLocation.y,
              made: true,
              playerName: prev.carrierName || "Unknown",
              playerJersey: prev.carrierNumber || "00",
              team,
              timestamp: Date.now(),
            };
            updatedState.basketballShots = [...prev.basketballShots, shot];
            setPendingShotLocation(null);
          }
          
          if (planLimits.canUseShotCharts && pendingPassStart && prev.sport === "football") {
            const dist = Math.sqrt(
              Math.pow(ballPhysics.current.x - pendingPassStart.x, 2) +
              Math.pow(ballPhysics.current.y - pendingPassStart.y, 2)
            );
            const pass: PassEvent = {
              id: Date.now().toString(),
              startX: pendingPassStart.x,
              startY: pendingPassStart.y,
              endX: ballPhysics.current.x,
              endY: ballPhysics.current.y,
              completed: true,
              playerName: prev.carrierName || "Unknown",
              playerJersey: prev.carrierNumber || "00",
              team,
              distance: Math.round(dist / 10),
              timestamp: Date.now(),
            };
            updatedState.footballPasses = [...prev.footballPasses, pass];
            setPendingPassStart(null);
          }
          
          if (planLimits.canUseShotCharts && pendingShotLocation && prev.sport === "baseball") {
            const hit: HitEvent = {
              id: Date.now().toString(),
              x: pendingShotLocation.x,
              y: pendingShotLocation.y,
              result: points === 1 ? "single" : points === 2 ? "double" : points === 3 ? "triple" : "hr",
              playerName: prev.carrierName || "Unknown",
              playerJersey: prev.carrierNumber || "00",
              team,
              timestamp: Date.now(),
            };
            updatedState.baseballHits = [...prev.baseballHits, hit];
            setPendingShotLocation(null);
          }
          
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
      // Mark canvas as focused when clicked
      setCanvasFocused(true);
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1920 / rect.width;
      const scaleY = 1080 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      mousePos.current = { x, y };
      
      // Check logo drag first (left-click only)
      if (e.button === 0 && dragLogoMode.current && logoImage && state.logoX !== null && state.logoY !== null) {
        const w = logoImage.width * state.logoScale;
        const h = logoImage.height * state.logoScale;
        if (x >= state.logoX - w/2 - 5 && x <= state.logoX + w/2 + 5 &&
            y >= state.logoY - h/2 - 5 && y <= state.logoY + h/2 + 5) {
          isDraggingLogo.current = true;
          return;
        }
      }
      
      // Left-click = drag ball (always enabled)
      const dist = Math.sqrt((x - ballPhysics.current.x) ** 2 + (y - ballPhysics.current.y) ** 2);
      if (e.button === 0 && dist < state.ballSize + 10) {
        isDraggingBall.current = true;
        return;
      }
      
      // Right-click on ball = ready to log play
      // Allow in Football mode (for Pass/Rush tracking) and in other sports if shot charts enabled
      const canRightClick = state.sport === "football" || planLimits.canUseShotCharts;
      console.log("🖱️ Right-click check:", { button: e.button, dist, ballSize: state.ballSize, sport: state.sport, canRightClick, waitingForShotResult: waitingForShotResultRef.current });
      
      if (e.button === 2 && dist < state.ballSize + 10 && canRightClick && !waitingForShotResultRef.current) {
        console.log("✅ Right-click on ball detected! Setting waitingForShotResult=true");
        setWaitingForShotResult(true);
        
        if (state.sport === "basketball") {
          toast({ description: "Ready to log shot - Press Z for MADE or X for MISSED" });
        } else if (state.sport === "football") {
          toast({ description: "Ready to log play - Press Z for RUSH or X for PASS" });
        } else if (state.sport === "baseball") {
          toast({ description: "Ready to log hit - Press Z for HIT or X for OUT" });
        }
        e.preventDefault();
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
    
    const handleContextMenu = (e: Event) => {
      e.preventDefault(); // Prevent right-click menu
    };
    
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("contextmenu", handleContextMenu);
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
      // Format: "Name,#number,hotkey" or "Name,#number" or "Name" (comma-separated)
      const parts = line.split(",").map(p => p.trim());
      
      let name = "";
      let jersey = "";
      let hotkey = "";
      
      if (parts.length >= 2) {
        // Format: Name,#number,hotkey OR Name,#number
        name = parts[0];
        const numberPart = parts[1];
        
        // Extract number (remove # if present)
        jersey = numberPart.startsWith("#") ? numberPart.substring(1) : numberPart;
        
        // Hotkey is optional (third part)
        if (parts.length >= 3) {
          hotkey = parts[2];
        }
      } else if (parts.length === 1) {
        // Try old format: "Name #number, hotkey" (space before #, comma before hotkey)
        const commaIndex = line.lastIndexOf(",");
        if (commaIndex !== -1) {
          const playerPart = line.substring(0, commaIndex).trim();
          hotkey = line.substring(commaIndex + 1).trim();
          
          const hashIndex = playerPart.lastIndexOf("#");
          if (hashIndex !== -1) {
            name = playerPart.substring(0, hashIndex).trim();
            jersey = playerPart.substring(hashIndex + 1).trim();
          } else {
            errors.push(`Missing #number: "${line}" (expected format: Name,#number,hotkey or Name,#number)`);
            continue;
          }
        } else {
          // Just a name with no number - skip this player
          errors.push(`Missing jersey number: "${line}" (expected format: Name,#number,hotkey or Name,#number)`);
          continue;
        }
      }

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

      // Validate hotkey (if provided) before adding to roster
      if (hotkey && hotkey.length > 0) {
        if (!/^[0-9a-z]$/.test(hotkey.toLowerCase())) {
          errors.push(`Invalid hotkey "${hotkey}" (must be 0-9 or a-z) in: "${line}"`);
          continue;
        }
        
        // Block Z, X, +, - (reserved for game actions)
        if (hotkey.toLowerCase() === "z" || hotkey.toLowerCase() === "x") {
          errors.push(`Cannot use "${hotkey}" as hotkey (reserved for shot logging: Z=Made, X=Missed)`);
          continue;
        }
        if (hotkey === "+" || hotkey === "-" || hotkey === "=" || hotkey === "_") {
          errors.push(`Cannot use "${hotkey}" as hotkey (reserved for football yardage: +=Add 5, -=Subtract 1)`);
          continue;
        }

        // Check for duplicate hotkeys
        if (usedHotkeys.has(hotkey.toLowerCase())) {
          errors.push(`Duplicate hotkey "${hotkey}" in: "${line}"`);
          continue;
        }

        usedHotkeys.add(hotkey.toLowerCase());
        hotkeys.push({ jersey, name, hotkey: hotkey.toLowerCase() });
      }
      
      // Add to roster regardless of hotkey (after validation passes)
      roster.push(jersey);
    }

    // All-or-nothing: if there are ANY errors, don't load anything
    if (errors.length > 0) {
      toast({ 
        description: errors.join("\n"), 
        variant: "destructive" 
      });
      return;
    }

    // Check plan limits for hotkeys (only count players with assigned hotkeys)
    const maxHotkeys = team === "home" ? planLimits.maxHotkeysHome : planLimits.maxHotkeysAway;
    if (hotkeys.length > maxHotkeys) {
      showUpgrade("Player Hotkeys");
      toast({
        title: "Hotkey Limit Exceeded",
        description: `${planLimits.planName} plan allows ${maxHotkeys} hotkey${maxHotkeys === 1 ? '' : 's'} per team. You tried to assign ${hotkeys.length} hotkeys. Upgrade for more.`,
        variant: "destructive",
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
        // Keep only the OTHER team's hotkeys, remove current team's old hotkeys
        const otherTeamHotkeys = prev.playerHotkeys.filter(h => {
          if (team === "home") {
            // Loading home team: keep only away team hotkeys
            return prev.awayRoster.includes(h.jersey);
          } else {
            // Loading away team: keep only home team hotkeys
            return prev.homeRoster.includes(h.jersey);
          }
        });
        
        console.log(`Loading ${team} team with ${roster.length} players`);
        console.log(`Other team hotkeys kept:`, otherTeamHotkeys);
        console.log(`New hotkeys:`, hotkeys);
        
        return { ...prev, playerHotkeys: [...otherTeamHotkeys, ...hotkeys] };
      });

      toast({ description: `Loaded ${roster.length} ${team} player(s)` });
    }
  };

  const clearTeamPlayers = (team: "home" | "away") => {
    if (team === "home") {
      setState(prev => {
        // Check if current ball carrier belongs to home team
        const isCarrierFromHomeTeam = prev.carrierNumber && prev.homeRoster.includes(prev.carrierNumber);
        
        // Clear ball carrier if they belong to the cleared team
        const updates: Partial<GameState> = {
          homeRoster: [],
          playerHotkeys: prev.playerHotkeys.filter(h => !prev.homeRoster.includes(h.jersey)),
        };
        
        if (isCarrierFromHomeTeam) {
          updates.carrierNumber = "";
          updates.carrierName = "";
        }
        
        // For Baseball: Clear runners if they belong to home team
        if (prev.sport === "baseball") {
          const newRunners = { ...prev.runners };
          if (prev.runners.first && prev.homeRoster.includes(prev.runners.first.name)) {
            newRunners.first = null;
          }
          if (prev.runners.second && prev.homeRoster.includes(prev.runners.second.name)) {
            newRunners.second = null;
          }
          if (prev.runners.third && prev.homeRoster.includes(prev.runners.third.name)) {
            newRunners.third = null;
          }
          updates.runners = newRunners;
          
          // Clear at-bat if they're from home team
          if (prev.atBatName && prev.homeRoster.includes(prev.atBatName)) {
            updates.atBatName = "";
            updates.atBatNumber = "";
          }
        }
        
        return { ...prev, ...updates };
      });
      setHomePlayersInput("");
    } else {
      setState(prev => {
        // Check if current ball carrier belongs to away team
        const isCarrierFromAwayTeam = prev.carrierNumber && prev.awayRoster.includes(prev.carrierNumber);
        
        // Clear ball carrier if they belong to the cleared team
        const updates: Partial<GameState> = {
          awayRoster: [],
          playerHotkeys: prev.playerHotkeys.filter(h => !prev.awayRoster.includes(h.jersey)),
        };
        
        if (isCarrierFromAwayTeam) {
          updates.carrierNumber = "";
          updates.carrierName = "";
        }
        
        // For Baseball: Clear runners if they belong to away team
        if (prev.sport === "baseball") {
          const newRunners = { ...prev.runners };
          if (prev.runners.first && prev.awayRoster.includes(prev.runners.first.name)) {
            newRunners.first = null;
          }
          if (prev.runners.second && prev.awayRoster.includes(prev.runners.second.name)) {
            newRunners.second = null;
          }
          if (prev.runners.third && prev.awayRoster.includes(prev.runners.third.name)) {
            newRunners.third = null;
          }
          updates.runners = newRunners;
          
          // Clear at-bat if they're from away team
          if (prev.atBatName && prev.awayRoster.includes(prev.atBatName)) {
            updates.atBatName = "";
            updates.atBatNumber = "";
          }
        }
        
        return { ...prev, ...updates };
      });
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
        soundSlots: data.soundSlots || Array(8).fill(null),
        basketballQuarter: data.basketballQuarter || 1,
        quarter: data.quarter || 1,
        playerLabelScale: data.playerLabelScale ?? 1.0,
        playerImageScale: data.playerImageScale ?? 1.0
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
  
  const nuclearReset = () => {
    // Clear ALL localStorage data
    localStorage.clear();
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
      // Check clip limit
      const totalClips = state.homeVideoClips.filter(c => c).length + state.awayVideoClips.filter(c => c).length;
      const currentClips = (team === "home" ? state.homeVideoClips : state.awayVideoClips).filter(c => c).length;
      
      // If this slot is empty, it would add a new clip
      const isNewClip = !(team === "home" ? state.homeVideoClips[index] : state.awayVideoClips[index]);
      
      if (isNewClip && totalClips >= planLimits.maxClips) {
        showUpgrade("Video Clips");
        toast({
          title: "Clip Limit Reached",
          description: `${planLimits.planName} plan allows ${planLimits.maxClips} video clip${planLimits.maxClips === 1 ? '' : 's'}. Upgrade for more.`,
          variant: "destructive",
        });
        return;
      }

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

  // Soundboard handlers
  const handleSoundUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if slot is locked based on plan
      if (index >= planLimits.maxSoundSlots) {
        showUpgrade("Soundboard Slots");
        toast({
          title: "Soundboard Slot Locked",
          description: `${planLimits.planName} plan allows ${planLimits.maxSoundSlots} soundboard slot${planLimits.maxSoundSlots === 1 ? '' : 's'}. Upgrade to unlock more.`,
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('audio/')) {
        toast({ description: "Please select a valid audio file", variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target?.result as string;
        setState(prev => {
          const slots = [...prev.soundSlots];
          slots[index] = { name: file.name, dataURL };
          return { ...prev, soundSlots: slots };
        });
        toast({ description: `Sound "${file.name}" uploaded to slot ${index + 1}` });
      };
      reader.readAsDataURL(file);
    }
  };

  const playSoundFile = (index: number) => {
    const sound = state.soundSlots[index];
    if (sound) {
      const audio = new Audio(sound.dataURL);
      audio.play().catch(err => {
        toast({ description: "Failed to play sound", variant: "destructive" });
        console.error("Sound playback error:", err);
      });
    }
  };

  const removeSoundSlot = (index: number) => {
    setState(prev => {
      const slots = [...prev.soundSlots];
      slots[index] = null;
      return { ...prev, soundSlots: slots };
    });
    toast({ description: `Sound removed from slot ${index + 1}` });
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
    if (!planLimits.canExport) {
      showUpgrade("Export");
      toast({
        title: "Export Not Available",
        description: `${planLimits.planName} plan doesn't include export. Upgrade to download your sessions.`,
        variant: "destructive",
      });
      return;
    }

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
    if (planLimits.exportType !== "full") {
      showUpgrade("CSV Export");
      toast({
        title: "CSV Export Not Available",
        description: `${planLimits.planName} plan doesn't include CSV export. Upgrade to Plus or higher for full export features.`,
        variant: "destructive",
      });
      return;
    }

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
        {/* User Menu */}
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              <div className="text-xs font-semibold text-primary uppercase">{user?.plan}</div>
            </div>
            <div className="flex gap-1">
              {user?.isAdmin && (
                <Button
                  data-testid="button-admin"
                  size="icon"
                  variant="ghost"
                  onClick={() => window.location.href = "/admin"}
                  title="Admin Dashboard"
                  className="h-8 w-8"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button
                data-testid="button-logout"
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await logout();
                  window.location.href = "/login";
                }}
                title="Logout"
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

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

        {/* Controller Instructions */}
        {gamepadConnected && (
          <Card className="p-4 space-y-2 bg-green-950/20 border-green-500/30">
            <Label className="text-xs uppercase tracking-wide text-green-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Controller Active
            </Label>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><span className="font-semibold text-foreground">L Stick / D-Pad:</span> Move Ball</div>
              <div><span className="font-semibold text-foreground">RT Hold:</span> Sprint (2x speed)</div>
              <div className="border-t border-card-border pt-1 mt-1"></div>
              {state.sport === "basketball" && (
                <>
                  <div><span className="font-semibold text-blue-400">RT Press:</span> Shoot / Log Shot</div>
                  <div><span className="font-semibold text-green-400">Y:</span> Make (after RT)</div>
                  <div><span className="font-semibold text-red-400">X:</span> Miss (after RT)</div>
                  <div><span className="font-semibold text-foreground">A:</span> Free Throw Mode</div>
                  <div><span className="font-semibold text-foreground">LT:</span> Reset Shot Clock</div>
                </>
              )}
              {state.sport === "football" && (
                <>
                  <div><span className="font-semibold text-blue-400">RT Press:</span> Log Play</div>
                  <div><span className="font-semibold text-green-400">Y:</span> Rush (after RT)</div>
                  <div><span className="font-semibold text-blue-400">X:</span> Pass (after RT)</div>
                  <div><span className="font-semibold text-foreground">Keyboard +/-:</span> Adjust Yards</div>
                  <div><span className="font-semibold text-foreground">LT:</span> Reset Play Clock</div>
                </>
              )}
              <div className="border-t border-card-border pt-1 mt-1"></div>
              <div><span className="font-semibold text-foreground">LB:</span> Toggle Game Clock</div>
              <div><span className="font-semibold text-foreground">RB:</span> Toggle Possession</div>
              <div><span className="font-semibold text-foreground">B:</span> Cycle Ball Carrier</div>
              <div><span className="font-semibold text-foreground">Select:</span> Cancel (if waiting)</div>
            </div>
          </Card>
        )}

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
              placeholder="Format: Name,#number,hotkey (or Name,#number)&#10;Example:&#10;Amen Thompson,#1,q&#10;Fred VanVleet,#5,w&#10;Jalen Green,#4"
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
              placeholder="Format: Name,#number,hotkey (or Name,#number)&#10;Example:&#10;Stephen Curry,#30,a&#10;Klay Thompson,#11,s&#10;Draymond Green,#23"
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
            <div className="border-t pt-2 space-y-3">
              <div className="text-xs text-muted-foreground">Active Hotkeys:</div>
              
              {/* Home Team Hotkeys */}
              {state.playerHotkeys.filter(h => h.hotkey && state.homeRoster.includes(h.jersey)).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-primary mb-1">{state.homeTeam}</div>
                  <div className="text-xs space-y-2">
                    {state.playerHotkeys.filter(h => h.hotkey && state.homeRoster.includes(h.jersey)).map(h => (
                      <div key={h.jersey} className="flex justify-between items-center gap-2">
                        <span className="font-bold">{h.hotkey.toUpperCase()}</span>
                        <span className="font-mono flex-1">{h.name} #{h.jersey}</span>
                        {planLimits.canUsePlayerImages ? (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`player-image-${h.jersey}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const dataURL = event.target?.result as string;
                                    setState(prev => ({
                                      ...prev,
                                  playerHotkeys: prev.playerHotkeys.map(hotkey =>
                                    hotkey.jersey === h.jersey ? { ...hotkey, imageDataURL: dataURL } : hotkey
                                  )
                                }));
                                toast({ description: `Image uploaded for ${h.name}` });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label 
                          htmlFor={`player-image-${h.jersey}`}
                          className="cursor-pointer"
                        >
                          {h.imageDataURL ? (
                            <img 
                              src={h.imageDataURL} 
                              alt={h.name}
                              className="w-6 h-6 rounded-full object-cover border border-primary"
                            />
                          ) : (
                            <Button
                              data-testid={`button-upload-image-${h.jersey}`}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <span>
                                <Upload className="h-3 w-3" />
                              </span>
                            </Button>
                          )}
                        </label>
                      </div>
                    ) : (
                      <Button
                        data-testid={`button-locked-image-${h.jersey}`}
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => showUpgrade("Player Images")}
                      >
                        <Lock className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                  </div>
                </div>
              )}

              {/* Away Team Hotkeys */}
              {state.playerHotkeys.filter(h => h.hotkey && state.awayRoster.includes(h.jersey)).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-primary mb-1">{state.awayTeam}</div>
                  <div className="text-xs space-y-2">
                    {state.playerHotkeys.filter(h => h.hotkey && state.awayRoster.includes(h.jersey)).map(h => (
                      <div key={h.jersey} className="flex justify-between items-center gap-2">
                        <span className="font-bold">{h.hotkey.toUpperCase()}</span>
                        <span className="font-mono flex-1">{h.name} #{h.jersey}</span>
                        {planLimits.canUsePlayerImages ? (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`player-image-${h.jersey}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const dataURL = event.target?.result as string;
                                    setState(prev => ({
                                      ...prev,
                                      playerHotkeys: prev.playerHotkeys.map(hotkey =>
                                        hotkey.jersey === h.jersey ? { ...hotkey, imageDataURL: dataURL } : hotkey
                                      )
                                    }));
                                    toast({ description: `Image uploaded for ${h.name}` });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label 
                              htmlFor={`player-image-${h.jersey}`}
                              className="cursor-pointer"
                            >
                              {h.imageDataURL ? (
                                <img 
                                  src={h.imageDataURL} 
                                  alt={h.name}
                                  className="w-6 h-6 rounded-full object-cover border border-primary"
                                />
                              ) : (
                                <Button
                                  data-testid={`button-upload-image-${h.jersey}`}
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-6 p-0"
                                  asChild
                                >
                                  <span>
                                    <Upload className="h-3 w-3" />
                                  </span>
                                </Button>
                              )}
                            </label>
                          </div>
                        ) : (
                          <Button
                            data-testid={`button-locked-image-${h.jersey}`}
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => showUpgrade("Player Images")}
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Carrier Display */}
          {state.carrierNumber && (
            <div className="border-t pt-2 space-y-2">
              <div className="text-xs text-muted-foreground mb-1">Current {state.sport === "baseball" ? "At-Bat" : "Ball Carrier"}:</div>
              <div className="text-sm font-semibold text-center">
                {state.carrierName} #{state.carrierNumber}
              </div>
              <Button
                data-testid="button-clear-carrier"
                size="sm"
                variant="outline"
                onClick={() => setState(prev => ({ ...prev, carrierNumber: "", carrierName: "" }))}
                className="w-full"
              >
                Clear {state.sport === "baseball" ? "At-Bat" : "Ball Carrier"}
              </Button>
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

        {/* Soundboard */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Soundboard</Label>
          
          <div className="grid grid-cols-2 gap-2">
            {Array(8).fill(null).map((_, index) => {
              const isLocked = index >= planLimits.maxSoundSlots;
              const sound = state.soundSlots[index];
              
              return (
                <div key={`sound-${index}`} className="space-y-1">
                  <div className="flex items-center gap-1">
                    {isLocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full opacity-50 cursor-not-allowed"
                        onClick={() => {
                          showUpgrade("Soundboard Slots");
                          toast({
                            title: "Soundboard Slot Locked",
                            description: `Upgrade to unlock this slot`,
                            variant: "destructive",
                          });
                        }}
                        data-testid={`button-sound-locked-${index}`}
                      >
                        <Lock className="h-3 w-3 mr-1" /> Slot {index + 1}
                      </Button>
                    ) : sound ? (
                      <div className="flex flex-col gap-1 w-full">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => playSoundFile(index)}
                          className="w-full text-xs"
                          data-testid={`button-play-sound-${index}`}
                        >
                          ▶ {sound.name.substring(0, 12)}...
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeSoundSlot(index)}
                          className="w-full text-xs"
                          data-testid={`button-remove-sound-${index}`}
                        >
                          ✕ Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="w-full">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleSoundUpload(index, e)}
                          className="hidden"
                          data-testid={`input-sound-${index}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          asChild
                        >
                          <span>
                            <Upload className="h-3 w-3 mr-1" /> Slot {index + 1}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
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
                <Button data-testid="button-home-minus1" size="sm" variant="outline" onClick={() => { 
                  if (state.homeScore > 0) {
                    setState(prev => ({ ...prev, homeScore: prev.homeScore - 1 })); 
                    logEvent("score", `${state.homeTeam} -1 (${state.homeScore - 1})`); 
                  }
                }}>-1</Button>
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
                <div className="relative">
                  <Input
                    data-testid="input-hotkey-home1"
                    value={state.scoreHotkeys.home1}
                    onChange={(e) => {
                      if (!planLimits.allowedScoreButtons.includes(1)) {
                        showUpgrade("Score Hotkeys");
                        toast({
                          title: "Feature Locked",
                          description: `${planLimits.planName} plan only allows +2 and +3 hotkeys. Upgrade for +1 hotkeys.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      const key = e.target.value.slice(-1).toLowerCase();
                      if (key && !/^[0-9a-z]$/.test(key)) return;
                      setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, home1: key } }));
                    }}
                    maxLength={1}
                    className="h-6 w-12 text-xs text-center"
                    placeholder="?"
                    disabled={!planLimits.allowedScoreButtons.includes(1)}
                  />
                  {!planLimits.allowedScoreButtons.includes(1) && (
                    <Lock className="absolute right-1 top-1 w-3 h-3 text-muted-foreground" />
                  )}
                </div>
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
                <Button data-testid="button-away-minus1" size="sm" variant="outline" onClick={() => { 
                  if (state.awayScore > 0) {
                    setState(prev => ({ ...prev, awayScore: prev.awayScore - 1 })); 
                    logEvent("score", `${state.awayTeam} -1 (${state.awayScore - 1})`); 
                  }
                }}>-1</Button>
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
                <div className="relative">
                  <Input
                    data-testid="input-hotkey-away1"
                    value={state.scoreHotkeys.away1}
                    onChange={(e) => {
                      if (!planLimits.allowedScoreButtons.includes(1)) {
                        showUpgrade("Score Hotkeys");
                        toast({
                          title: "Feature Locked",
                          description: `${planLimits.planName} plan only allows +2 and +3 hotkeys. Upgrade for +1 hotkeys.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      const key = e.target.value.slice(-1).toLowerCase();
                      if (key && !/^[0-9a-z]$/.test(key)) return;
                      setState(prev => ({ ...prev, scoreHotkeys: { ...prev.scoreHotkeys, away1: key } }));
                    }}
                    maxLength={1}
                    className="h-6 w-12 text-xs text-center"
                    placeholder="?"
                    disabled={!planLimits.allowedScoreButtons.includes(1)}
                  />
                  {!planLimits.allowedScoreButtons.includes(1) && (
                    <Lock className="absolute right-1 top-1 w-3 h-3 text-muted-foreground" />
                  )}
                </div>
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
            <Button
              data-testid="button-show-shot-chart"
              size="sm"
              variant="default"
              onClick={() => {
                if (!planLimits.canUseShotCharts) {
                  showUpgrade("Shot Charts");
                  return;
                }
                setShowChartModal(true);
              }}
              className="w-full flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {planLimits.canUseShotCharts ? "Shot Chart" : <><Lock className="h-3 w-3" /> Shot Chart</>}
            </Button>
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
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Current Play</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Yards</span>
                <div className="flex gap-1">
                  <Button data-testid="button-yards-minus" size="sm" variant="outline" onClick={() => setCurrentPlayYards(prev => prev - 1)}>−1</Button>
                  <span data-testid="text-current-yards" className={`px-3 py-1 rounded font-mono font-bold ${currentPlayYards > 0 ? 'bg-green-500/20 text-green-400' : currentPlayYards < 0 ? 'bg-red-500/20 text-red-400' : 'bg-muted'}`}>
                    {currentPlayYards > 0 ? '+' : ''}{currentPlayYards}
                  </span>
                  <Button data-testid="button-yards-plus" size="sm" variant="outline" onClick={() => setCurrentPlayYards(prev => prev + 5)}>+5</Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Press + to add 5 yards, − to subtract 1 yard<br/>
                Right-click ball, then press Z (rush) or X (pass) to log
              </div>
            </Card>
            <Button
              data-testid="button-show-pass-chart"
              size="sm"
              variant="default"
              onClick={() => {
                if (!planLimits.canUseShotCharts) {
                  showUpgrade("Pass/Rush Charts");
                  return;
                }
                setShowChartModal(true);
              }}
              className="w-full flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {planLimits.canUseShotCharts ? "Pass/Rush Chart" : <><Lock className="h-3 w-3" /> Pass/Rush Chart</>}
            </Button>
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
                        return { ...prev, strikes: 0, balls: 0, outs: 0, inningHalf: newHalf, inning: newInning, runners: { first: null, second: null, third: null }, atBatName: "", atBatNumber: "" };
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
                      return { ...prev, strikes: 0, balls: 0, outs: 0, inningHalf: newHalf, inning: newInning, runners: { first: null, second: null, third: null }, atBatName: "", atBatNumber: "" };
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
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">At Bat</Label>
              <div className="text-sm text-center py-2 bg-muted rounded font-mono">
                {state.atBatName ? `${state.atBatName} #${state.atBatNumber}` : "No batter set"}
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Runners (Max 4)</Label>
              {/* Runner 1 - At Bat */}
              <div className="space-y-2 p-2 bg-muted/50 rounded">
                <div className="text-xs font-bold text-primary">Runner 1 (At Bat)</div>
                <div className="text-sm font-mono mb-2">
                  {state.atBatName ? `${state.atBatName} #${state.atBatNumber}` : "Not set"}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    data-testid="button-r1-1b"
                    size="sm"
                    variant="outline"
                    disabled={!state.atBatName}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.atBatName) return prev;
                        const runner = { name: prev.atBatName, number: prev.atBatNumber };
                        toast({ description: `${runner.name} → 1B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, first: runner },
                          atBatName: "",
                          atBatNumber: ""
                        };
                      });
                    }}
                  >
                    1B
                  </Button>
                  <Button
                    data-testid="button-r1-2b"
                    size="sm"
                    variant="outline"
                    disabled={!state.atBatName}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.atBatName) return prev;
                        const runner = { name: prev.atBatName, number: prev.atBatNumber };
                        toast({ description: `${runner.name} → 2B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, second: runner },
                          atBatName: "",
                          atBatNumber: ""
                        };
                      });
                    }}
                  >
                    2B
                  </Button>
                  <Button
                    data-testid="button-r1-3b"
                    size="sm"
                    variant="outline"
                    disabled={!state.atBatName}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.atBatName) return prev;
                        const runner = { name: prev.atBatName, number: prev.atBatNumber };
                        toast({ description: `${runner.name} → 3B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, third: runner },
                          atBatName: "",
                          atBatNumber: ""
                        };
                      });
                    }}
                  >
                    3B
                  </Button>
                  <Button
                    data-testid="button-r1-home"
                    size="sm"
                    variant="outline"
                    disabled={!state.atBatName}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.atBatName) return prev;
                        const runner = { name: prev.atBatName, number: prev.atBatNumber };
                        const team = prev.possession === "home" ? "homeScore" : "awayScore";
                        goalFlash.current = { active: true, team: prev.possession, startTime: performance.now() };
                        toast({ description: `${runner.name} scores! 🎉` });
                        return {
                          ...prev,
                          [team]: prev[team] + 1,
                          atBatName: "",
                          atBatNumber: ""
                        };
                      });
                    }}
                  >
                    ⌂
                  </Button>
                </div>
                <Button
                  data-testid="button-r1-out"
                  size="sm"
                  variant="destructive"
                  disabled={!state.atBatName}
                  onClick={() => {
                    setState(prev => {
                      if (!prev.atBatName) return prev;
                      const runner = { name: prev.atBatName, number: prev.atBatNumber };
                      toast({ description: `${runner.name} is OUT` });
                      return {
                        ...prev,
                        atBatName: "",
                        atBatNumber: ""
                      };
                    });
                  }}
                  className="w-full"
                >
                  Out
                </Button>
              </div>

              {/* Runner on 1st Base */}
              <div className="space-y-2 p-2 bg-muted/30 rounded">
                <div className="text-xs font-bold">Runner on 1B</div>
                <div className="text-sm font-mono mb-2">
                  {state.runners.first ? `${state.runners.first.name} #${state.runners.first.number}` : "Empty"}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    data-testid="button-r2-2b"
                    size="sm"
                    variant="outline"
                    disabled={!state.runners.first}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.first) return prev;
                        const runner = prev.runners.first;
                        toast({ description: `${runner.name} → 2B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, first: null, second: runner }
                        };
                      });
                    }}
                  >
                    2B
                  </Button>
                  <Button
                    data-testid="button-r2-3b"
                    size="sm"
                    variant="outline"
                    disabled={!state.runners.first}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.first) return prev;
                        const runner = prev.runners.first;
                        toast({ description: `${runner.name} → 3B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, first: null, third: runner }
                        };
                      });
                    }}
                  >
                    3B
                  </Button>
                  <Button
                    data-testid="button-r2-home"
                    size="sm"
                    variant="outline"
                    disabled={!state.runners.first}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.first) return prev;
                        const runner = prev.runners.first;
                        const team = prev.possession === "home" ? "homeScore" : "awayScore";
                        goalFlash.current = { active: true, team: prev.possession, startTime: performance.now() };
                        toast({ description: `${runner.name} scores! 🎉` });
                        return {
                          ...prev,
                          [team]: prev[team] + 1,
                          runners: { ...prev.runners, first: null }
                        };
                      });
                    }}
                  >
                    ⌂
                  </Button>
                </div>
                <Button
                  data-testid="button-r2-out"
                  size="sm"
                  variant="destructive"
                  disabled={!state.runners.first}
                  onClick={() => {
                    setState(prev => {
                      if (!prev.runners.first) return prev;
                      const runner = prev.runners.first;
                      toast({ description: `${runner.name} is OUT` });
                      return {
                        ...prev,
                        runners: { ...prev.runners, first: null }
                      };
                    });
                  }}
                  className="w-full"
                >
                  Out
                </Button>
              </div>

              {/* Runner on 2nd Base */}
              <div className="space-y-2 p-2 bg-muted/30 rounded">
                <div className="text-xs font-bold">Runner on 2B</div>
                <div className="text-sm font-mono mb-2">
                  {state.runners.second ? `${state.runners.second.name} #${state.runners.second.number}` : "Empty"}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    data-testid="button-r3-1b"
                    size="sm"
                    variant="secondary"
                    disabled={!state.runners.second}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.second) return prev;
                        const runner = prev.runners.second;
                        toast({ description: `${runner.name} ← 1B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, second: null, first: runner }
                        };
                      });
                    }}
                  >
                    ← 1B
                  </Button>
                  <Button
                    data-testid="button-r3-3b"
                    size="sm"
                    variant="outline"
                    disabled={!state.runners.second}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.second) return prev;
                        const runner = prev.runners.second;
                        toast({ description: `${runner.name} → 3B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, second: null, third: runner }
                        };
                      });
                    }}
                  >
                    3B
                  </Button>
                  <Button
                    data-testid="button-r3-home"
                    size="sm"
                    variant="outline"
                    disabled={!state.runners.second}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.second) return prev;
                        const runner = prev.runners.second;
                        const team = prev.possession === "home" ? "homeScore" : "awayScore";
                        goalFlash.current = { active: true, team: prev.possession, startTime: performance.now() };
                        toast({ description: `${runner.name} scores! 🎉` });
                        return {
                          ...prev,
                          [team]: prev[team] + 1,
                          runners: { ...prev.runners, second: null }
                        };
                      });
                    }}
                  >
                    ⌂
                  </Button>
                </div>
                <Button
                  data-testid="button-r3-out"
                  size="sm"
                  variant="destructive"
                  disabled={!state.runners.second}
                  onClick={() => {
                    setState(prev => {
                      if (!prev.runners.second) return prev;
                      const runner = prev.runners.second;
                      toast({ description: `${runner.name} is OUT` });
                      return {
                        ...prev,
                        runners: { ...prev.runners, second: null }
                      };
                    });
                  }}
                  className="w-full"
                >
                  Out
                </Button>
              </div>

              {/* Runner on 3rd Base */}
              <div className="space-y-2 p-2 bg-muted/30 rounded">
                <div className="text-xs font-bold">Runner on 3B</div>
                <div className="text-sm font-mono mb-2">
                  {state.runners.third ? `${state.runners.third.name} #${state.runners.third.number}` : "Empty"}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    data-testid="button-r4-1b"
                    size="sm"
                    variant="secondary"
                    disabled={!state.runners.third}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.third) return prev;
                        const runner = prev.runners.third;
                        toast({ description: `${runner.name} ← 1B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, third: null, first: runner }
                        };
                      });
                    }}
                  >
                    ← 1B
                  </Button>
                  <Button
                    data-testid="button-r4-2b"
                    size="sm"
                    variant="secondary"
                    disabled={!state.runners.third}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.third) return prev;
                        const runner = prev.runners.third;
                        toast({ description: `${runner.name} ← 2B` });
                        return {
                          ...prev,
                          runners: { ...prev.runners, third: null, second: runner }
                        };
                      });
                    }}
                  >
                    ← 2B
                  </Button>
                  <Button
                    data-testid="button-r4-home"
                    size="sm"
                    variant="outline"
                    disabled={!state.runners.third}
                    onClick={() => {
                      setState(prev => {
                        if (!prev.runners.third) return prev;
                        const runner = prev.runners.third;
                        const team = prev.possession === "home" ? "homeScore" : "awayScore";
                        goalFlash.current = { active: true, team: prev.possession, startTime: performance.now() };
                        toast({ description: `${runner.name} scores! 🎉` });
                        return {
                          ...prev,
                          [team]: prev[team] + 1,
                          runners: { ...prev.runners, third: null }
                        };
                      });
                    }}
                  >
                    ⌂
                  </Button>
                </div>
                <Button
                  data-testid="button-r4-out"
                  size="sm"
                  variant="destructive"
                  disabled={!state.runners.third}
                  onClick={() => {
                    setState(prev => {
                      if (!prev.runners.third) return prev;
                      const runner = prev.runners.third;
                      toast({ description: `${runner.name} is OUT` });
                      return {
                        ...prev,
                        runners: { ...prev.runners, third: null }
                      };
                    });
                  }}
                  className="w-full"
                >
                  Out
                </Button>
              </div>

              <Button data-testid="button-clear-bases" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, runners: { first: null, second: null, third: null } }))} className="w-full">Clear All Bases</Button>
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
            <Button
              data-testid="button-show-hit-chart"
              size="sm"
              variant="default"
              onClick={() => {
                if (!planLimits.canUseShotCharts) {
                  showUpgrade("Hit Charts");
                  return;
                }
                setShowChartModal(true);
              }}
              className="w-full flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {planLimits.canUseShotCharts ? "Hit Chart" : <><Lock className="h-3 w-3" /> Hit Chart</>}
            </Button>
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

        {/* Player Label Controls */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Player Label</Label>
          <div>
            <Label className="text-xs">Name Text Size</Label>
            <Slider
              data-testid="slider-player-label-scale"
              value={[state.playerLabelScale]}
              onValueChange={([val]) => setState(prev => ({ ...prev, playerLabelScale: val }))}
              min={0.5}
              max={2.0}
              step={0.1}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground text-center mt-1">{state.playerLabelScale.toFixed(1)}x</div>
          </div>
          <div>
            <Label className="text-xs">Player Image Size</Label>
            <Slider
              data-testid="slider-player-image-scale"
              value={[state.playerImageScale]}
              onValueChange={([val]) => setState(prev => ({ ...prev, playerImageScale: val }))}
              min={0.5}
              max={2.0}
              step={0.1}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground text-center mt-1">{state.playerImageScale.toFixed(1)}x</div>
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
          <Button data-testid="button-nuclear-reset" size="sm" variant="destructive" onClick={nuclearReset} className="w-full">⚠️ RESET ALL DATA</Button>
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
          <div className="w-full max-w-[1600px] aspect-video relative">
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              className="w-full h-full border border-card-border rounded-lg shadow-lg"
              style={{ cursor: isDraggingBall.current || isDraggingLogo.current ? "grabbing" : "default" }}
              onClick={() => setCanvasFocused(true)}
            />
            {!canvasFocused && (
              <div 
                className="absolute top-4 right-4 bg-card/95 border border-primary rounded-lg px-3 py-2 text-xs shadow-lg cursor-pointer hover-elevate"
                onClick={() => setCanvasFocused(true)}
              >
                <p className="font-semibold">🖱️ Click to activate</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Hints */}
        <div className="bg-card/90 backdrop-blur-md border-t border-card-border flex items-center justify-between px-6 py-2">
          {/* Controller Status */}
          {gamepadConnected && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-semibold">Controller Connected</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground text-center flex-1">
            {gamepadConnected ? (
              <>
                <div>
                  <span className="font-semibold">RT Press:</span> Shoot/Log &nbsp;|&nbsp;
                  <span className="font-semibold">Y:</span> Make &nbsp;|&nbsp;
                  <span className="font-semibold">X:</span> Miss &nbsp;|&nbsp;
                  <span className="font-semibold">LB:</span> Game Clock &nbsp;|&nbsp;
                  <span className="font-semibold">RB:</span> Possession
                </div>
                {state.sport === "basketball" && (
                  <div className="mt-1">
                    <span className="font-semibold">A:</span> Free Throw &nbsp;|&nbsp;
                    <span className="font-semibold">LT:</span> Shot Clock &nbsp;|&nbsp;
                    <span className="font-semibold">RT Hold:</span> Sprint
                  </div>
                )}
                {state.sport === "football" && (
                  <div className="mt-1">
                    <span className="font-semibold">Y:</span> Rush &nbsp;|&nbsp;
                    <span className="font-semibold">X:</span> Pass &nbsp;|&nbsp;
                    <span className="font-semibold">LT:</span> Play Clock &nbsp;|&nbsp;
                    <span className="font-semibold">RT Hold:</span> Sprint
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span className="font-semibold">Arrows:</span> Move Ball &nbsp;|&nbsp;
                  <span className="font-semibold">Shift:</span> Sprint &nbsp;|&nbsp;
                  <span className="font-semibold">Space:</span> Pulse &nbsp;|&nbsp;
                  <span className="font-semibold">Mouse:</span> Click & Drag
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Right-Click Ball:</span> Log Stat &nbsp;
                  {state.sport === "basketball" && (
                    <>|&nbsp; <span className="font-semibold">SPACE before shot:</span> Mark as Free Throw</>
                  )}
                </div>
              </>
            )}
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

      {/* Chart Modal */}
      <Dialog open={showChartModal} onOpenChange={setShowChartModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {state.sport === "basketball" ? "Shot Chart" : 
               state.sport === "football" ? "Pass/Rush Chart" : "Hit Chart"}
            </DialogTitle>
            <DialogDescription>
              Click team to see all shots, or select a player to see individual stats
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Team and Player Filter Dropdowns */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-xs mb-1">Team Filter</Label>
                <Select value={selectedTeamFilter} onValueChange={(v: "home" | "away") => {
                  setSelectedTeamFilter(v);
                  setSelectedPlayerFilter("all");
                }}>
                  <SelectTrigger data-testid="select-team-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{state.homeTeam} (Home)</SelectItem>
                    <SelectItem value="away">{state.awayTeam} (Away)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label className="text-xs mb-1">Player Filter</Label>
                <Select value={selectedPlayerFilter} onValueChange={setSelectedPlayerFilter}>
                  <SelectTrigger data-testid="select-player-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    {state.playerHotkeys
                      .filter(h => {
                        // Show players from the selected team
                        const isInHomeRoster = state.homeRoster.includes(h.jersey);
                        const isInAwayRoster = state.awayRoster.includes(h.jersey);
                        
                        if (selectedTeamFilter === "home") {
                          return isInHomeRoster || (!isInHomeRoster && !isInAwayRoster);
                        } else {
                          return isInAwayRoster || (!isInHomeRoster && !isInAwayRoster);
                        }
                      })
                      .map(h => (
                        <SelectItem key={h.jersey} value={h.jersey}>
                          {h.name} #{h.jersey}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Basketball Shot Chart */}
            {state.sport === "basketball" && (() => {
              console.log("📊 All basketball shots:", state.basketballShots);
              console.log("📊 Team filter:", selectedTeamFilter, "Player filter:", selectedPlayerFilter);
              
              const filteredShots = (state.basketballShots || []).filter(shot => {
                console.log("Checking shot:", shot, "vs team:", selectedTeamFilter, "player:", selectedPlayerFilter);
                if (shot.team !== selectedTeamFilter) return false;
                if (selectedPlayerFilter !== "all" && shot.playerJersey !== selectedPlayerFilter) return false;
                return true;
              });
              
              console.log("📊 Filtered shots:", filteredShots);
              
              // Calculate FG% (all non-free throw shots)
              const fgShots = filteredShots.filter(s => !s.isFreeThrow);
              const fgMade = fgShots.filter(s => s.made).length;
              const fgPct = fgShots.length > 0 ? Math.round((fgMade / fgShots.length) * 100) : 0;
              
              // Calculate 3PT%
              const threePointers = filteredShots.filter(s => s.points === 3);
              const threeMade = threePointers.filter(s => s.made).length;
              const threePct = threePointers.length > 0 ? Math.round((threeMade / threePointers.length) * 100) : 0;
              
              // Calculate FT%
              const freeThrows = filteredShots.filter(s => s.isFreeThrow);
              const ftMade = freeThrows.filter(s => s.made).length;
              const ftPct = freeThrows.length > 0 ? Math.round((ftMade / freeThrows.length) * 100) : 0;
              
              return (
                <div className="space-y-4">
                  <div className="text-sm font-bold bg-muted p-4 rounded space-y-1">
                    <div>FG: {fgMade}/{fgShots.length} ({fgPct}%) | 3PT: {threeMade}/{threePointers.length} ({threePct}%) | FT: {ftMade}/{freeThrows.length} ({ftPct}%)</div>
                    <div className="text-xs text-muted-foreground">Total Shots: {filteredShots.length}</div>
                  </div>
                  <div className="relative w-full rounded-lg shadow-2xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080">
                      {/* Court background image */}
                      <image href={basketballCourtImage} x="0" y="0" width="1920" height="1080" preserveAspectRatio="none"/>
                      
                      {/* Hoops - aligned with backboards, smaller size */}
                      <circle cx="230" cy="540" r="20" stroke="#ff6600" strokeWidth="8" fill="none"/>
                      <circle cx="1690" cy="540" r="20" stroke="#ff6600" strokeWidth="8" fill="none"/>
                      
                      {/* Shots */}
                      {filteredShots.map(shot => (
                        <circle
                          key={shot.id}
                          cx={shot.x}
                          cy={shot.y}
                          r="18"
                          fill={shot.made ? "#22c55e" : "#ef4444"}
                          opacity="0.85"
                          stroke="white"
                          strokeWidth="3"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              );
            })()}
            
            {/* Football Pass/Rush Chart */}
            {state.sport === "football" && (() => {
              const filteredPlays = (state.footballPlays || []).filter(play => {
                if (play.team !== selectedTeamFilter) return false;
                if (selectedPlayerFilter !== "all" && play.playerJersey !== selectedPlayerFilter) return false;
                return true;
              });
              const rushes = filteredPlays.filter(p => p.type === "rush");
              const passes = filteredPlays.filter(p => p.type === "pass");
              const totalRushYards = rushes.reduce((sum, p) => sum + p.yards, 0);
              const totalPassYards = passes.reduce((sum, p) => sum + p.yards, 0);
              const avgRushYards = rushes.length > 0 ? (totalRushYards / rushes.length).toFixed(1) : "0.0";
              const avgPassYards = passes.length > 0 ? (totalPassYards / passes.length).toFixed(1) : "0.0";
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-500/20 p-3 rounded">
                      <div className="text-xs text-muted-foreground">RUSHING</div>
                      <div className="text-2xl font-bold">{rushes.length} plays</div>
                      <div className="text-sm">{totalRushYards} yards | {avgRushYards} avg</div>
                    </div>
                    <div className="bg-green-500/20 p-3 rounded">
                      <div className="text-xs text-muted-foreground">PASSING</div>
                      <div className="text-2xl font-bold">{passes.length} plays</div>
                      <div className="text-sm">{totalPassYards} yards | {avgPassYards} avg</div>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Player</th>
                          <th className="text-right p-2">Yards</th>
                          <th className="text-right p-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlays.map(play => (
                          <tr key={play.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                play.type === "rush" ? "bg-blue-500/30 text-blue-300" : "bg-green-500/30 text-green-300"
                              }`}>
                                {play.type === "rush" ? "RUSH" : "PASS"}
                              </span>
                            </td>
                            <td className="p-2">{play.playerName} #{play.playerJersey}</td>
                            <td className={`text-right p-2 font-bold ${play.yards > 0 ? "text-green-400" : play.yards < 0 ? "text-red-400" : ""}`}>
                              {play.yards > 0 ? "+" : ""}{play.yards}
                            </td>
                            <td className="text-right p-2 text-muted-foreground text-xs">
                              {new Date(play.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            
            {/* Baseball Hit Chart */}
            {state.sport === "baseball" && (() => {
              const filteredHits = (state.baseballHits || []).filter(hit => {
                if (hit.team !== selectedTeamFilter) return false;
                if (selectedPlayerFilter !== "all" && hit.playerJersey !== selectedPlayerFilter) return false;
                return true;
              });
              const singles = filteredHits.filter(h => h.result === "single").length;
              const doubles = filteredHits.filter(h => h.result === "double").length;
              const triples = filteredHits.filter(h => h.result === "triple").length;
              const hrs = filteredHits.filter(h => h.result === "hr").length;
              const outs = filteredHits.filter(h => h.result === "out").length;
              
              return (
                <div className="space-y-4">
                  <div className="text-base font-bold bg-muted p-3 rounded">
                    Total: {filteredHits.length} | 1B: {singles} | 2B: {doubles} | 3B: {triples} | HR: {hrs} | Out: {outs}
                  </div>
                  <div className="relative w-full bg-[#2d5016] rounded shadow-lg" style={{ paddingBottom: "56.25%" }}>
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080">
                      {/* Baseball field - matching actual field dimensions */}
                      {/* Dirt infield diamond */}
                      <path d="M 960,900 L 500,440 L 960,180 L 1420,440 Z" fill="#c19a6b"/>
                      {/* Bases */}
                      <rect x="945" y="885" width="30" height="30" fill="white"/>
                      <rect x="485" y="425" width="30" height="30" fill="white"/>
                      <rect x="945" y="165" width="30" height="30" fill="white"/>
                      <rect x="1405" y="425" width="30" height="30" fill="white"/>
                      {/* Pitcher's mound */}
                      <circle cx="960" cy="670" r="80" fill="#a67c52"/>
                      {/* Hits */}
                      {filteredHits.map(hit => {
                        const colors = {
                          single: "#22c55e",
                          double: "#3b82f6",
                          triple: "#a855f7",
                          hr: "#f59e0b",
                          out: "#ef4444"
                        };
                        return (
                          <circle
                            key={hit.id}
                            cx={hit.x}
                            cy={hit.y}
                            r="15"
                            fill={colors[hit.result]}
                            opacity="0.7"
                            stroke="white"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="inline-block w-3 h-3 rounded-full bg-[#22c55e] mr-1"></span>Single
                    <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6] ml-3 mr-1"></span>Double
                    <span className="inline-block w-3 h-3 rounded-full bg-[#a855f7] ml-3 mr-1"></span>Triple
                    <span className="inline-block w-3 h-3 rounded-full bg-[#f59e0b] ml-3 mr-1"></span>HR
                    <span className="inline-block w-3 h-3 rounded-full bg-[#ef4444] ml-3 mr-1"></span>Out
                  </div>
                </div>
              );
            })()}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (state.sport === "basketball") {
                    setState(prev => ({ ...prev, basketballShots: [] }));
                  } else if (state.sport === "football") {
                    setState(prev => ({ ...prev, footballPlays: [], footballPasses: [] }));
                  } else {
                    setState(prev => ({ ...prev, baseballHits: [] }));
                  }
                }}
              >
                Clear Chart
              </Button>
              <Button onClick={() => setShowChartModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={planLimits.currentPlan}
        featureName={upgradeFeatureName}
      />
    </div>
  );
}
