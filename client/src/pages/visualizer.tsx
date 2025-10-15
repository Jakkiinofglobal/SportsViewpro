import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Sport = "basketball" | "football" | "baseball";
type SpeedMultiplier = 0.75 | 1.0 | 1.25 | 1.5;

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
  
  // Clock
  gameClockTime: number;
  gameClockRunning: boolean;
  speedMultiplier: SpeedMultiplier;
  
  // Basketball
  shotClockTime: number;
  
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
  
  // Logo
  logoX: number | null;
  logoY: number | null;
  logoScale: number;
  logoDataURL: string | null;
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
    gameClockTime: 720,
    gameClockRunning: false,
    speedMultiplier: 1.0,
    shotClockTime: 24.0,
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
    logoX: null,
    logoY: null,
    logoScale: 0.5,
    logoDataURL: null,
  });

  const [homeRosterInput, setHomeRosterInput] = useState("");
  const [awayRosterInput, setAwayRosterInput] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const stateRef = useRef(state);

  // Load session on mount
  useEffect(() => {
    const saved = localStorage.getItem("msv:session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setState(data);
        setHomeRosterInput(data.homeRoster.join(", "));
        setAwayRosterInput(data.awayRoster.join(", "));
        
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
  };

  const drawBall = (ctx: CanvasRenderingContext2D) => {
    const { sport, carrierNumber } = state;
    const ballX = ballPhysics.current.x;
    const ballY = ballPhysics.current.y;
    const ballAngle = ballPhysics.current.angle;
    
    ctx.save();
    
    // Draw trail
    if (state.ballTrail && trailPoints.current.length > 0) {
      trailPoints.current.forEach(point => {
        ctx.fillStyle = `rgba(255, 255, 255, ${point.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
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
    ctx.ellipse(5, 5, sport === "football" ? 25 : 20, sport === "football" ? 15 : 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ball based on sport
    if (sport === "basketball") {
      // Orange basketball
      ctx.fillStyle = "#ff8c00";
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Seams
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20, Math.PI/4, Math.PI*3/4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 20, Math.PI*5/4, Math.PI*7/4);
      ctx.stroke();
    } else if (sport === "football") {
      // Brown football
      ctx.fillStyle = "#6b4423";
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
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
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      
      // Red stitching
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 15, Math.PI + 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Carrier label
    if (carrierNumber) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(ballX - 25, ballY + 30, 50, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 14px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${carrierNumber}`, ballX, ballY + 42);
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
  }, []);

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
      if (dist < 30) {
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

  const loadTeam = (type: "home" | "away") => {
    const saved = localStorage.getItem(`msv:${type}`);
    if (saved) {
      const data = JSON.parse(saved);
      if (type === "home") {
        setState(prev => ({ ...prev, homeTeam: data.name, homeRoster: data.roster }));
        setHomeRosterInput(data.roster.join(", "));
      } else {
        setState(prev => ({ ...prev, awayTeam: data.name, awayRoster: data.roster }));
        setAwayRosterInput(data.roster.join(", "));
      }
      toast({ description: `${type.toUpperCase()} team loaded` });
    }
  };

  const parseRoster = (input: string): string[] => {
    return input.split(",").map(s => s.trim()).filter(s => s.length > 0);
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
      setState(data);
      setHomeRosterInput(data.homeRoster.join(", "));
      setAwayRosterInput(data.awayRoster.join(", "));
      
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

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

        {/* Teams */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Teams</Label>
          <div className="space-y-2">
            <Input
              data-testid="input-home-team"
              placeholder="Home Team"
              value={state.homeTeam}
              onChange={(e) => setState(prev => ({ ...prev, homeTeam: e.target.value }))}
            />
            <Input
              data-testid="input-home-roster"
              placeholder="Home Roster (1,2,3,...)"
              value={homeRosterInput}
              onChange={(e) => {
                setHomeRosterInput(e.target.value);
                setState(prev => ({ ...prev, homeRoster: parseRoster(e.target.value) }));
              }}
            />
            <div className="flex gap-2">
              <Button data-testid="button-save-home" size="sm" variant="outline" onClick={() => saveTeam("home")} className="flex-1">Save</Button>
              <Button data-testid="button-load-home" size="sm" variant="outline" onClick={() => loadTeam("home")} className="flex-1">Load</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Input
              data-testid="input-away-team"
              placeholder="Away Team"
              value={state.awayTeam}
              onChange={(e) => setState(prev => ({ ...prev, awayTeam: e.target.value }))}
            />
            <Input
              data-testid="input-away-roster"
              placeholder="Away Roster (1,2,3,...)"
              value={awayRosterInput}
              onChange={(e) => {
                setAwayRosterInput(e.target.value);
                setState(prev => ({ ...prev, awayRoster: parseRoster(e.target.value) }));
              }}
            />
            <div className="flex gap-2">
              <Button data-testid="button-save-away" size="sm" variant="outline" onClick={() => saveTeam("away")} className="flex-1">Save</Button>
              <Button data-testid="button-load-away" size="sm" variant="outline" onClick={() => loadTeam("away")} className="flex-1">Load</Button>
            </div>
          </div>
        </Card>

        {/* Scoreboard */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Scoreboard</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{state.homeTeam}</span>
              <div className="flex gap-1">
                <Button data-testid="button-home-plus1" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, homeScore: prev.homeScore + 1 }))}>+1</Button>
                {state.sport !== "baseball" && <Button data-testid="button-home-plus2" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, homeScore: prev.homeScore + 2 }))}>+2</Button>}
                {state.sport !== "baseball" && <Button data-testid="button-home-plus3" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, homeScore: prev.homeScore + 3 }))}>+3</Button>}
              </div>
              <span data-testid="text-home-score" className="text-2xl font-display font-bold">{state.homeScore}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{state.awayTeam}</span>
              <div className="flex gap-1">
                <Button data-testid="button-away-plus1" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, awayScore: prev.awayScore + 1 }))}>+1</Button>
                {state.sport !== "baseball" && <Button data-testid="button-away-plus2" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, awayScore: prev.awayScore + 2 }))}>+2</Button>}
                {state.sport !== "baseball" && <Button data-testid="button-away-plus3" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, awayScore: prev.awayScore + 3 }))}>+3</Button>}
              </div>
              <span data-testid="text-away-score" className="text-2xl font-display font-bold">{state.awayScore}</span>
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
          <Card className="p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Shot Clock</Label>
            <div data-testid="text-shot-clock" className="text-3xl font-mono font-bold text-center">{state.shotClockTime.toFixed(1)}</div>
            <div className="flex gap-2">
              <Button data-testid="button-shot-14" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, shotClockTime: 14.0 }))} className="flex-1">24→14</Button>
              <Button data-testid="button-shot-reset" size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, shotClockTime: 24.0 }))} className="flex-1">Reset 24</Button>
            </div>
          </Card>
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
          </>
        )}

        {/* Roster & Carrier */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ball Carrier</Label>
          <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
            <SelectTrigger data-testid="select-carrier">
              <SelectValue placeholder="Select Jersey #" />
            </SelectTrigger>
            <SelectContent>
              {allRoster.map(num => (
                <SelectItem key={num} value={num}>#{num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            data-testid="button-set-carrier"
            size="sm"
            variant="default"
            onClick={() => setState(prev => ({ ...prev, carrierNumber: selectedCarrier }))}
            disabled={!selectedCarrier}
            className="w-full"
          >
            Make {state.sport === "baseball" ? "At-Bat" : "Ball Carrier"}
          </Button>
          {state.carrierNumber && (
            <div className="text-sm text-center text-muted-foreground">
              Current: #{state.carrierNumber}
            </div>
          )}
        </Card>

        {/* Ball Controls */}
        <Card className="p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ball Controls</Label>
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
        </Card>

        {/* Session */}
        <Card className="p-4 space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Session</Label>
          <Button data-testid="button-save-session" size="sm" variant="default" onClick={saveSession} className="w-full">Save Session</Button>
          <Button data-testid="button-load-session" size="sm" variant="outline" onClick={loadSession} className="w-full">Load Session</Button>
          <Button data-testid="button-new-session" size="sm" variant="outline" onClick={newSession} className="w-full">New Session</Button>
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
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-mono">
              {state.sport === "basketball" && "Q" + Math.ceil((720 - state.gameClockTime) / 180)}
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
    </div>
  );
}
