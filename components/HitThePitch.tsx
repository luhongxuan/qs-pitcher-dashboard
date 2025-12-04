
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Target, User, FastForward, MousePointer2 } from 'lucide-react';
import { PitchType } from '../types';
import { getPitches } from '../services/api';

type GameState = 'idle' | 'inFlight' | 'result';
type BallPhase = 'idle' | 'flight' | 'miss' | 'hit' | 'homerun' | 'take';
type Difficulty = 'easy' | 'normal' | 'hard';
type PitchCategory = 'fastball' | 'sinker' | 'slider' | 'curve' | 'changeup' | 'cutter' | 'splitter';

interface HitThePitchProps {
  pitcherId: string;
  pitcherName: string;
  pitches?: PitchType[];
}

interface Scoreboard {
  seen: number;
  hits: number;
  homeRuns: number;
  misses: number;
  swings: number;
}

interface PitchFlightProfile {
  targetX: number; // 0-100
  targetY: number; // 0-100
  breakX: number;  // Horizontal break magnitude
  breakY: number;  // Vertical break magnitude
  type: PitchCategory;
  wobblePhase: number; // Random phase for slight life
}

// Configuration for Difficulty
// Zones: Percent of travel (0 = pitcher, 100 = plate)
// HitWindow: Max allowed horizontal distance (%) between bat and ball
const DIFFICULTY_ZONES = {
  easy:   { orangeStart: 35, greenStart: 75, hitWindow: 20 }, 
  normal: { orangeStart: 45, greenStart: 82, hitWindow: 12 }, 
  hard:   { orangeStart: 55, greenStart: 88, hitWindow: 8 } 
};

// Easing functions for smooth trajectories
const easeInQuad = (t: number) => t * t;
const easeOutQuad = (t: number) => t * (2 - t);
const easeInCubic = (t: number) => t * t * t;

export const HitThePitch: React.FC<HitThePitchProps> = ({ pitcherId, pitcherName, pitches: initialPitches }) => {
  const [pitches, setPitches] = useState<PitchType[]>(initialPitches || []);
  const [loading, setLoading] = useState(!initialPitches);
  
  // Game State
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentPitch, setCurrentPitch] = useState<PitchType | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState<Scoreboard>({ seen: 0, hits: 0, homeRuns: 0, misses: 0, swings: 0 });
  const [lastResult, setLastResult] = useState<{ text: string; subtext?: string; color: string } | null>(null);
  
  // DOM Refs for direct manipulation (60fps performance)
  const fieldRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const batRef = useRef<HTMLDivElement>(null);
  
  // Logic Refs
  const progressRef = useRef<number>(0); // 0.0 to 1.0 (Pitch Progress)
  const batXRef = useRef<number>(50); // 0 to 100 (Horizontal Bat Position)
  const currentBallXRef = useRef<number>(50); // 0 to 100 (Current Ball X)
  
  // Pitch Profile Ref (computed once per pitch)
  const pitchProfileRef = useRef<PitchFlightProfile>({
    targetX: 50, targetY: 82, breakX: 0, breakY: 0, type: 'fastball', wobblePhase: 0
  });

  // Animation Loop State
  const animationFrameRef = useRef<number>(0);
  const phaseStartTimeRef = useRef<number>(0);
  const pitchDurationRef = useRef<number>(0);
  const ballPhaseRef = useRef<BallPhase>('idle');
  
  // Contact State for Transitions
  const contactStateRef = useRef({
      startX: 50, startY: 15, startScale: 0.4,
      targetX: 50, targetY: 82, targetScale: 1.3
  });

  // Load pitches if needed
  useEffect(() => {
    if (!initialPitches) {
      getPitches(pitcherId).then(data => {
        setPitches(data);
        setLoading(false);
      });
    }
  }, [pitcherId, initialPitches]);

  // Keyboard listener for Spacebar (Alternative Swing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); 
        if (gameState === 'inFlight') {
            handleSwing();
        } else if (gameState === 'idle' || gameState === 'result') {
            startPitch();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // --- Input Handlers ---

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!fieldRef.current) return;

    let clientX;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = (e as React.MouseEvent).clientX;
    }

    const rect = fieldRef.current.getBoundingClientRect();
    // Calculate relative X position (0 to 1)
    const relativeX = (clientX - rect.left) / rect.width;
    // Clamp between 0 and 100%
    const clampedX = Math.max(0, Math.min(100, relativeX * 100));
    
    batXRef.current = clampedX;
    
    // Update Bat Visual Immediately
    if (batRef.current) {
        batRef.current.style.left = `${clampedX}%`;
    }
  };

  const handleFieldClick = () => {
    if (gameState === 'inFlight') {
        handleSwing();
    }
  };

  // --- Game Loop Logic ---

  const startPitch = () => {
    if (pitches.length === 0) return;
    if (gameState === 'inFlight') return;

    // 1. Select random pitch based on weight
    const rand = Math.random();
    let cumulative = 0;
    let selected = pitches[0];
    for (const p of pitches) {
      cumulative += p.weight;
      if (rand <= cumulative) {
        selected = p;
        break;
      }
    }
    
    setCurrentPitch(selected);
    setGameState('inFlight'); 
    setLastResult(null);
    progressRef.current = 0;
    ballPhaseRef.current = 'flight';

    // 2. Set duration based on velocity (Deterministic)
    const FAST = 98;
    const SLOW = 75;
    const MIN_DUR = 550;
    const MAX_DUR = 950;

    const v = Math.max(SLOW, Math.min(FAST, selected.avg_velocity || 90));
    const speedFactor = (FAST - v) / (FAST - SLOW); // 0 (fastest) to 1 (slowest)
    pitchDurationRef.current = MIN_DUR + (MAX_DUR - MIN_DUR) * speedFactor;

    // 3. Build Pitch Flight Profile (Deterministic for the duration of the flight)
    
    // Map Code to Category
    let category: PitchCategory = 'fastball';
    const code = selected.code || 'FF';
    const movement = selected.movement || 'straight';

    if (code === 'SL' || code === 'ST') category = 'slider';
    else if (code === 'CU' || code === 'KC') category = 'curve';
    else if (code === 'CH') category = 'changeup';
    else if (code === 'SI') category = 'sinker';
    else if (code === 'FC') category = 'cutter';
    else if (code === 'FS') category = 'splitter';
    else if (movement === 'sink') category = 'sinker';
    else if (movement === 'slide') category = 'slider';
    else if (movement === 'curve') category = 'curve';

    // Calculate usage/weight factor to influence break magnitude
    // Higher weight = slightly more "characteristic" break
    const usageFactor = Math.max(0.5, Math.min(1.2, selected.weight * 1.5));

    // Base Break Magnitudes (tuned for visual feel)
    let bX = 0;
    let bY = 0;

    switch (category) {
      case 'fastball': bX = 1 * usageFactor; bY = -2 * usageFactor; break; // Tiny wiggle, slight rise
      case 'sinker':   bX = -12 * usageFactor; bY = 8 * usageFactor; break; // Run left, drop
      case 'slider':   bX = 14 * usageFactor; bY = 4 * usageFactor; break; // Break right, slight drop
      case 'curve':    bX = -4 * usageFactor; bY = 22 * usageFactor; break; // Big drop
      case 'changeup': bX = -2 * usageFactor; bY = 10 * usageFactor; break; // Late drop
      case 'cutter':   bX = 5 * usageFactor; bY = 2 * usageFactor; break; // Small cut right
      case 'splitter': bX = 0; bY = 16 * usageFactor; break; // Heavy drop
    }

    // Randomize Target within Strike Zone (Deterministic for this pitch)
    // 50 is center. Zone is approx +/- 12
    const zoneRandomX = (Math.random() - 0.5) * 24; 
    const zoneRandomY = (Math.random() - 0.5) * 18;
    
    pitchProfileRef.current = {
      targetX: 50 + zoneRandomX,
      targetY: 82 + zoneRandomY,
      breakX: bX,
      breakY: bY,
      type: category,
      wobblePhase: Math.random() * Math.PI * 2
    };

    // 4. Reset Visuals
    if (ballRef.current) {
        ballRef.current.style.opacity = '0';
        ballRef.current.style.transition = 'none';
        updateBallVisuals(0, 'flight', selected); 
    }
    if (cursorRef.current) {
        cursorRef.current.style.top = '0%';
    }

    // 5. Start Animation Loop
    phaseStartTimeRef.current = performance.now();
    cancelAnimationFrame(animationFrameRef.current);
    requestAnimationFrame(updateGameLoop);
  };

  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  /**
   * Pure function to compute ball position based on profile and progress t
   */
  const computeBallPosition = (t: number, profile: PitchFlightProfile) => {
    // 15% is pitcher y, 82% is plate y
    // We linearly interpolate the "base" path, then add offsets
    const startX = 50;
    const startY = 15;
    
    // Linear base path to target
    const baseX = lerp(startX, profile.targetX, t);
    const baseY = lerp(startY, profile.targetY, t);

    let offsetX = 0;
    let offsetY = 0;

    // Movement Physics Simulation
    switch (profile.type) {
      case 'fastball':
        // Mostly straight, tiny rise (illusion of velocity)
        offsetX = profile.breakX * easeOutQuad(t);
        offsetY = profile.breakY * t; 
        break;
        
      case 'sinker':
        // Armside run (early/mid) + late drop
        offsetX = profile.breakX * easeInQuad(t);
        offsetY = profile.breakY * t * t;
        break;
        
      case 'slider':
        // Late horizontal snap
        // Breaks hardest in last 40%
        offsetX = profile.breakX * easeInCubic(Math.max(0, t - 0.3) / 0.7);
        offsetY = profile.breakY * t;
        break;
        
      case 'curve':
        // Parabolic arc: Start high, drop low
        // (1 - (2t-1)^2) creates a hump. We invert this for drop.
        // Actually simpler: Gravity grows with t^2
        const gravity = profile.breakY * (t * t); 
        // Small initial rise to sell the drop
        const hump = Math.sin(t * Math.PI) * 5; 
        offsetY = gravity - hump * 0.5;
        offsetX = profile.breakX * t;
        break;
        
      case 'changeup':
        // Straight look, then bottom falls out
        offsetX = profile.breakX * easeOutQuad(t);
        offsetY = profile.breakY * easeInQuad(Math.max(0, t - 0.4) / 0.6);
        break;
        
      case 'cutter':
        // Late small glove-side cut
        offsetX = profile.breakX * easeInQuad(Math.max(0, t - 0.5) / 0.5);
        offsetY = profile.breakY * t;
        break;
        
      case 'splitter':
        // Straight then drops off table
        offsetX = profile.breakX * t;
        offsetY = profile.breakY * easeInCubic(Math.max(0, t - 0.5) / 0.5);
        break;
    }

    // Add very subtle wobble for "life" (not frame-random, but function of t)
    const wobble = Math.sin(t * 10 + profile.wobblePhase) * 0.3;

    return {
      x: baseX + offsetX + wobble,
      y: baseY + offsetY
    };
  };

  const updateBallVisuals = (t: number, phase: BallPhase, pitch: PitchType | null) => {
      if (!ballRef.current) return;
      
      let top, left, scale, opacity = 1;

      if (phase === 'flight') {
          // Use smooth compute function
          const pos = computeBallPosition(t, pitchProfileRef.current);
          top = pos.y;
          left = pos.x;

          // Scale: Distance perspective
          const startScale = 0.4;
          const endScale = 1.3;
          scale = lerp(startScale, endScale, t);

          currentBallXRef.current = left; // Update ref for collision detection
          
          opacity = t < 0.1 ? t * 10 : 1;
          
          // Store state for transition to hit/miss animation
          contactStateRef.current = { startX: left, startY: top, startScale: scale, targetX: 0, targetY: 0, targetScale: 0 };
      
      } else if (phase === 'miss' || phase === 'take') {
          // Continue past plate
          const { startX, startY, startScale } = contactStateRef.current;
          top = lerp(startY, 95, t); 
          left = lerp(startX, 50, t); // Center towards mitt
          scale = lerp(startScale, 1.0, t);
          opacity = 1 - t; 
      
      } else if (phase === 'hit') {
          // Arc into field
          const { startX, startY, startScale, targetX } = contactStateRef.current;
          const targetY = 20; 
          
          top = lerp(startY, targetY, t);
          top -= Math.sin(t * Math.PI) * 15; // Arc

          left = lerp(startX, targetX, t);
          scale = lerp(startScale, 0.3, t); 
          opacity = 1;

      } else if (phase === 'homerun') {
          // Launch high and far
          const { startX, startY, startScale, targetX } = contactStateRef.current;
          const targetY = -20; 
          
          top = lerp(startY, targetY, t);
          top -= Math.sin(t * Math.PI) * 30; // High Moonshot

          left = lerp(startX, targetX, t);
          scale = lerp(startScale, 0.2, t);
          opacity = t > 0.8 ? 1 - (t - 0.8) * 5 : 1;
      }

      ballRef.current.style.top = `${top}%`;
      ballRef.current.style.left = `${left}%`;
      ballRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      ballRef.current.style.opacity = `${opacity}`;
  };

  const updateGameLoop = () => {
    const now = performance.now();
    const elapsed = now - phaseStartTimeRef.current;
    
    if (ballPhaseRef.current === 'flight') {
        const progress = Math.min(elapsed / pitchDurationRef.current, 1);
        progressRef.current = progress;

        updateBallVisuals(progress, 'flight', currentPitch);
        
        // Update Vertical Timing Cursor
        // Top = 0% (Red/Start), Bottom = 100% (Green/End)
        if (cursorRef.current) {
            cursorRef.current.style.top = `${progress * 100}%`;
        }

        if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(updateGameLoop);
        } else {
            endGame();
        }
    } else {
        // Post-Contact Animations
        let duration = 500;
        if (ballPhaseRef.current === 'hit') duration = 800;
        if (ballPhaseRef.current === 'homerun') duration = 1200;

        const t = Math.min(elapsed / duration, 1);
        updateBallVisuals(t, ballPhaseRef.current, null);

        if (t < 1) {
            animationFrameRef.current = requestAnimationFrame(updateGameLoop);
        }
    }
  };

  const handleSwing = () => {
    if (gameState !== 'inFlight') return;
    
    const now = performance.now();
    
    // --- 1. Timing Calculation (Vertical Progress) ---
    const progressPercent = progressRef.current * 100;
    const { orangeStart, greenStart, hitWindow } = DIFFICULTY_ZONES[difficulty];
    
    // --- 2. Alignment Calculation (Horizontal Bat vs Ball) ---
    const ballX = currentBallXRef.current;
    const batX = batXRef.current;
    const deltaX = Math.abs(ballX - batX);
    
    // --- 3. Determine Result ---
    let nextPhase: BallPhase = 'miss';
    let resultText = "SWING & MISS";
    let subText = "";
    let color = "text-rose-500";

    const isAlignmentGood = deltaX <= hitWindow;

    if (!isAlignmentGood) {
        // Miss due to Aim
        resultText = "WHIFF!";
        subText = "Bad Aim";
        setScore(prev => ({ ...prev, seen: prev.seen + 1, misses: prev.misses + 1, swings: prev.swings + 1 }));
    } else {
        // Aim is good, check Timing
        if (progressPercent >= greenStart) {
            // Perfect Timing (End/Bottom Zone) -> Home Run
            resultText = "HOME RUN!";
            subText = "Perfect!";
            color = "text-emerald-400";
            nextPhase = 'homerun';
            setScore(prev => ({ ...prev, seen: prev.seen + 1, hits: prev.hits + 1, homeRuns: prev.homeRuns + 1, swings: prev.swings + 1 }));
            contactStateRef.current.targetX = Math.random() * 80 + 10; 
        } else if (progressPercent >= orangeStart) {
            // Good Timing (Middle Zone) -> Hit
            resultText = "SOLID HIT";
            subText = "Base Hit";
            color = "text-amber-400";
            nextPhase = 'hit';
            setScore(prev => ({ ...prev, seen: prev.seen + 1, hits: prev.hits + 1, swings: prev.swings + 1 }));
            contactStateRef.current.targetX = Math.random() * 60 + 20; 
        } else {
            // Bad Timing (Top Zone / Too Early)
            resultText = "TOO EARLY";
            subText = "Wait longer...";
            setScore(prev => ({ ...prev, seen: prev.seen + 1, misses: prev.misses + 1, swings: prev.swings + 1 }));
        }
    }

    // Visual Impact
    if (ballRef.current && nextPhase !== 'miss') {
         ballRef.current.style.filter = 'brightness(5) drop-shadow(0 0 10px white)';
         setTimeout(() => { if(ballRef.current) ballRef.current.style.filter = 'none'; }, 100);
    }

    setLastResult({ text: resultText, subtext: subText, color });
    setGameState('result');
    
    ballPhaseRef.current = nextPhase;
    phaseStartTimeRef.current = now;
  };

  const endGame = () => {
    setGameState('result');
    ballPhaseRef.current = 'take';
    phaseStartTimeRef.current = performance.now();
    setScore(prev => ({ ...prev, seen: prev.seen + 1 }));
    setLastResult({ text: "TAKE", subtext: "Strike Called", color: 'text-slate-400' });
    requestAnimationFrame(updateGameLoop);
  };

  const hitRate = score.swings > 0 ? Math.round((score.hits / score.swings) * 100) : 0;
  const zones = DIFFICULTY_ZONES[difficulty];

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Scouting Pitch Repertoire...</div>;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden relative select-none flex flex-col h-auto">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="text-yellow-400 fill-yellow-400" size={20} />
                Hit the Pitch
            </h3>
            <p className="text-sm text-slate-400">Facing: <span className="font-semibold text-slate-200">{pitcherName}</span></p>
        </div>
        
        {/* Compact Scoreboard */}
        <div className="flex gap-3 bg-slate-950/80 backdrop-blur p-2 rounded-lg border border-slate-800 text-xs sm:text-sm">
            <div className="text-center px-2">
                <div className="text-slate-500 uppercase text-[10px]">AVG</div>
                <div className="font-mono font-bold text-blue-400">.{hitRate}</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
                <div className="text-slate-500 uppercase text-[10px]">Hits</div>
                <div className="font-mono font-bold text-emerald-400">{score.hits}</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
                <div className="text-slate-500 uppercase text-[10px]">HR</div>
                <div className="font-mono font-bold text-yellow-400">{score.homeRuns}</div>
            </div>
        </div>
      </div>

      {/* 3D POV Game Field Container */}
      <div 
        ref={fieldRef}
        className="relative w-full h-[320px] bg-slate-950 rounded-xl border-2 border-slate-800 overflow-hidden mb-6 cursor-crosshair group shadow-2xl touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onClick={handleFieldClick}
      >
        
        {/* 1. Environment Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-green-950/20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>

        {/* 2. Pitcher (Distance) */}
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-80 scale-75 pointer-events-none">
             <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                <User size={16} className="text-slate-400" />
             </div>
             <div className="w-16 h-2 bg-slate-800 rounded-full mt-1 blur-[2px]"></div>
        </div>

        {/* 3. Foul Lines */}
        <div className="absolute top-[15%] left-1/2 w-[600px] h-[600px] -translate-x-1/2 border-l border-r border-slate-800/30 transform pointer-events-none" 
             style={{ perspective: '500px', transform: 'translateX(-50%) rotateX(60deg)' }}>
        </div>

        {/* 4. Batter Silhouette (Static) */}
        <div className="absolute bottom-[-10px] left-[10%] pointer-events-none z-20 opacity-40 flex flex-col items-center">
            <div className="w-14 h-14 bg-slate-400 rounded-full mb-[-5px] shadow-lg"></div>
            <div className="w-24 h-40 bg-slate-500 rounded-t-3xl relative"></div>
        </div>
        
        {/* 5. Home Plate */}
        <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none">
            <div className="w-32 h-16 bg-slate-200 clip-path-home-plate shadow-lg shadow-black/50" 
                 style={{ clipPath: 'polygon(50% 0, 100% 40%, 100% 100%, 0 100%, 0 40%)' }}>
            </div>
        </div>

        {/* 6. Vertical Timing Bar (Moved to RIGHT, Top=Red -> Bottom=Green) */}
        <div className="absolute bottom-4 right-8 z-30 pointer-events-none">
            {/* The Bar Itself */}
            <div className="relative h-40 w-3 rounded-full overflow-hidden bg-slate-900 border border-slate-600 shadow-xl flex flex-col">
                {/* Red (Top, Start/Early) */}
                <div 
                    className="w-full bg-rose-900/80 border-b border-rose-800/50" 
                    style={{ flex: 3 }} // ~37.5%
                />
                {/* Orange (Middle, Approach) */}
                <div 
                    className="w-full bg-amber-500/80 border-b border-amber-600/50" 
                    style={{ flex: 3 }} // ~37.5%
                />
                {/* Green (Bottom, Hit Zone) */}
                <div 
                    className="w-full bg-emerald-500" 
                    style={{ flex: 2 }} // ~25%
                >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>

                {/* Moving Cursor */}
                <div 
                    ref={cursorRef}
                    className="absolute left-0 right-0 h-1.5 bg-white shadow-[0_0_8px_white] z-10 transition-none will-change-transform"
                    style={{ top: '0%' }}
                />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest text-slate-500 whitespace-nowrap">
                Timing
            </div>
        </div>

        {/* 7. Mouse-Controlled Bat */}
        <div 
            ref={batRef}
            className="absolute bottom-[10%] w-16 h-4 bg-gradient-to-r from-amber-700 to-amber-900 rounded-full shadow-lg z-40 transition-none pointer-events-none border border-amber-950"
            style={{ 
                left: '50%', // Controlled by JS
                transform: 'translateX(-50%)'
            }}
        >
             {/* Bat handle detail */}
             <div className="absolute left-1 top-0 bottom-0 w-4 bg-black/20 rounded-l-full"></div>
        </div>

        {/* 8. The Ball */}
        <div 
            ref={ballRef}
            className="absolute w-8 h-8 rounded-full bg-white shadow-xl z-30 will-change-transform pointer-events-none"
            style={{ 
                top: '15%', 
                left: '50%', 
                opacity: 0,
                boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.2), 0 0 15px rgba(255,255,255,0.2)' 
            }}
        >
            <div className="absolute inset-0 border-[1px] border-red-600/40 rounded-full opacity-60 animate-spin-slow"></div>
        </div>
        
        {/* 9. Result Overlay */}
        {gameState === 'result' && lastResult && (
             <div className="absolute top-1/3 left-0 right-0 flex flex-col items-center justify-center z-50 animate-in zoom-in-50 duration-300 pointer-events-none">
                <h2 className={`text-5xl font-black italic tracking-tighter ${lastResult.color} drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] stroke-black`}>
                    {lastResult.text}
                </h2>
                {lastResult.subtext && (
                    <span className="text-white font-bold text-lg mt-1 bg-black/50 px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md">
                        {lastResult.subtext}
                    </span>
                )}
             </div>
        )}

        {/* 10. Start / Hint Overlay */}
        {gameState === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                <div className="bg-black/60 backdrop-blur-sm px-6 py-4 rounded-xl border border-slate-700 text-center animate-in fade-in zoom-in">
                    <MousePointer2 className="mx-auto text-blue-400 mb-2 animate-bounce" size={24} />
                    <p className="text-white font-bold">Move Mouse to Aim</p>
                    <p className="text-slate-300 text-sm">Click Field to Swing</p>
                </div>
            </div>
        )}

        {/* Pitch Info Tag */}
        {gameState === 'inFlight' && currentPitch && (
            <div className="absolute top-4 right-4 bg-slate-900/60 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-blue-200 font-mono shadow-lg pointer-events-none">
                <div className="font-bold text-white text-sm">{currentPitch.name}</div>
                <div>{currentPitch.avg_velocity} MPH</div>
            </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="flex flex-col gap-4 mt-auto">
        
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            {/* Difficulty Controls */}
            <div className="flex bg-slate-800 p-1 rounded-lg self-start">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                    <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        disabled={gameState === 'inFlight'}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                            difficulty === d ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        } ${gameState === 'inFlight' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {d}
                    </button>
                ))}
            </div>

            {/* Action Buttons Row */}
            <div className="flex-1 flex gap-3">
                {/* Button 1: Next Pitch */}
                <button 
                    onClick={startPitch}
                    disabled={gameState === 'inFlight'}
                    className={`flex-1 font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border-b-4 ${
                        gameState === 'inFlight'
                        ? 'bg-slate-800 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-blue-600 border-blue-800 hover:bg-blue-500 text-white active:scale-95 active:border-b-0 active:translate-y-1 shadow-blue-900/20'
                    }`}
                >
                    {gameState === 'idle' ? 'Start Pitch' : 'Next Pitch'}
                    {gameState !== 'inFlight' && <FastForward size={18} fill="currentColor" />}
                </button>

                {/* Button 2: Swing Indicator (Visual Only mostly, but usable) */}
                <button 
                    onMouseDown={handleSwing} // Keep functionality if needed
                    disabled={gameState !== 'inFlight'}
                    className={`flex-[1.5] font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border-b-4 group ${
                        gameState !== 'inFlight'
                        ? 'bg-slate-800 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-rose-600 border-rose-800 hover:bg-rose-500 text-white active:scale-95 active:border-b-0 active:translate-y-1 shadow-rose-900/20'
                    }`}
                >
                    <Target size={20} />
                    CLICK TO SWING
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
