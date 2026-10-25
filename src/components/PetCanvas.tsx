import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CharacterConfig, ExpressionType, Particle } from '../types/pet';
import { PendulumPhysics } from '../services/physicsEngine';
import { audioEngine } from '../services/audioEngine';

interface PetCanvasProps {
  character: CharacterConfig;
  petEnabled: boolean;
  musicEnabled: boolean;
  hangingEnabled: boolean;
  anchorX: number;
  isPopupOpen?: boolean;
  onAnchorXChange?: (newX: number) => void;
  onPetClick?: () => void;
  onPetDoubleClick?: (x: number, y: number) => void;
  onExpressionChange?: (expr: ExpressionType) => void;
}

export const PetCanvas: React.FC<PetCanvasProps> = ({
  character,
  petEnabled,
  musicEnabled,
  hangingEnabled,
  anchorX,
  isPopupOpen,
  onAnchorXChange,
  onPetClick,
  onPetDoubleClick,
  onExpressionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const physicsRef = useRef<PendulumPhysics>(new PendulumPhysics(anchorX, 0, character.threadLength));

  // State
  const [currentExpression, setCurrentExpression] = useState<ExpressionType>(character.currentExpression);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveringAnchor, setIsHoveringAnchor] = useState(false);

  // Interaction & Double-click Refs
  const isDraggingAnchorRef = useRef<boolean>(false);
  const clickTimerRef = useRef<number | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sync anchorX from external props
  useEffect(() => {
    physicsRef.current.setAnchor(anchorX, 0);
  }, [anchorX]);

  // Animation Timers & Secondary Motion Refs
  const charImageRef = useRef<HTMLImageElement | null>(null);
  const blinkTimerRef = useRef<number>(0);
  const isBlinkingRef = useRef<boolean>(false);
  const blinkDurationRef = useRef<number>(0);
  const breatheTimeRef = useRef<number>(0);
  const earTwitchRef = useRef<number>(0);
  const inactivityTimerRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const nextParticleIdRef = useRef<number>(1);
  const dizzyTimeoutRef = useRef<number | null>(null);

  // Load custom character image if present
  useEffect(() => {
    if (character.imageUrl) {
      const img = new Image();
      img.src = character.imageUrl.includes('?') ? character.imageUrl : `${character.imageUrl}?v=crisp2`;
      img.onload = () => {
        charImageRef.current = img;
      };
    } else {
      charImageRef.current = null;
    }
  }, [character.imageUrl]);

  // Sync external expression updates
  useEffect(() => {
    setCurrentExpression(character.currentExpression);
  }, [character.currentExpression]);

  // Spawn visual particles
  const spawnParticle = useCallback((type: 'note' | 'heart' | 'zzz' | 'sparkle', x: number, y: number, color?: string) => {
    const p: Particle = {
      id: nextParticleIdRef.current++,
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 20 - 10),
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 1.8 + 0.8),
      type,
      color: color || '#f43f5e',
      alpha: 1,
      scale: Math.random() * 0.4 + 0.8,
      rotation: (Math.random() - 0.5) * 0.5,
      life: 0,
      maxLife: type === 'zzz' ? 120 : 70,
    };
    particlesRef.current.push(p);
  }, []);

  const dprRef = useRef<number>(typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1);

  // Handle Window Resizing with High-DPI Retina Support
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        dprRef.current = dpr;
        const w = window.innerWidth;
        const h = window.innerHeight;

        canvasRef.current.width = Math.round(w * dpr);
        canvasRef.current.height = Math.round(h * dpr);
        canvasRef.current.style.width = `${w}px`;
        canvasRef.current.style.height = `${h}px`;

        physicsRef.current.setAnchor(anchorX, 0);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [anchorX]);

  // Main Render & Physics Loop
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = dprRef.current || 1;
      ctx.save();
      // Clear native pixel buffer
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Enable high-quality anti-aliased image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (!petEnabled) {
        // Draw discrete top screen pin so user can re-open settings
        drawHiddenPin(ctx, physicsRef.current.state.anchorX);
        ctx.restore();
        animFrame = requestAnimationFrame(loop);
        return;
      }

      const physics = physicsRef.current;
      const beatIntensity = audioEngine.getBeatIntensity();
      const isDancing = musicEnabled && audioEngine.isPlaying();

      // Step Physics
      if (hangingEnabled) {
        physics.step(dt, character.threadLength, isDancing, beatIntensity);
      } else {
        // Free float mode if hanging is turned off
        physics.state.bobX = window.innerWidth / 2;
        physics.state.bobY = 220;
        physics.state.angle = 0;
      }



      // Timing states
      breatheTimeRef.current += dt;
      inactivityTimerRef.current += dt;

      // Handle Sleep Mode after 18 seconds of inactivity
      if (inactivityTimerRef.current > 18 && currentExpression === 'idle' && !physics.state.isDragging) {
        setCurrentExpression('sleepy');
        onExpressionChange?.('sleepy');
        audioEngine.playChime('sleep');
      }

      // Spawn Zzz particles when sleeping
      if (currentExpression === 'sleepy' && Math.random() < 0.03) {
        spawnParticle('zzz', physics.state.bobX + 25, physics.state.bobY - 40, '#a5b4fc');
      }

      // Spawn music note particles when dancing
      if (isDancing && Math.random() < 0.06 + beatIntensity * 0.1) {
        const noteColors = ['#f472b6', '#38bdf8', '#c084fc', '#fbbf24'];
        const chosenColor = noteColors[Math.floor(Math.random() * noteColors.length)];
        spawnParticle('note', physics.state.bobX + (Math.random() * 60 - 30), physics.state.bobY - 30, chosenColor);
      }

      // Eye blink controller
      blinkTimerRef.current += dt;
      if (!isBlinkingRef.current && blinkTimerRef.current > (currentExpression === 'sleepy' ? 1.5 : 3.5)) {
        if (Math.random() < 0.6) {
          isBlinkingRef.current = true;
          blinkDurationRef.current = 0.14;
        }
        blinkTimerRef.current = 0;
      }
      if (isBlinkingRef.current) {
        blinkDurationRef.current -= dt;
        if (blinkDurationRef.current <= 0) {
          isBlinkingRef.current = false;
        }
      }

      // Ear twitch controller
      earTwitchRef.current += dt;
      const isEarTwitching = Math.sin(earTwitchRef.current * 4) > 0.8 && earTwitchRef.current % 5 < 0.4;

      // --- 1. Draw Hanging Thread ---
      if (hangingEnabled) {
        drawThread(ctx, physics.state.anchorX, physics.state.anchorY, physics.state.bobX, physics.state.bobY, character);
      }

      // --- 2. Draw Particles Behind/Around Pet ---
      updateAndDrawParticles(ctx, dt);

      // --- 3. Draw Chibi Character ---
      ctx.save();
      ctx.translate(physics.state.bobX, physics.state.bobY);

      // Apply pendulum tilt and scale
      const tilt = hangingEnabled ? physics.state.angle * 0.85 : 0;
      const beatBob = isDancing ? Math.sin(time * 0.012) * (8 * beatIntensity) : 0;
      ctx.rotate(tilt);
      ctx.scale(character.scale, character.scale);

      // Draw character (Reze & Denji or procedural vector chibi)
      if (charImageRef.current && charImageRef.current.complete && character.imageUrl) {
        const img = charImageRef.current;
        const breathScale = 1 + Math.sin(breatheTimeRef.current * 2.2) * 0.015;
        const w = 180 * breathScale;
        const h = 180 * breathScale;
        ctx.drawImage(img, -w / 2, -22 + beatBob, w, h);

        // Blushing & love glow for Reze & Denji
        if (character.id === 'reze_denji' && (currentExpression === 'happy' || isDancing || isHovered)) {
          ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
          ctx.beginPath();
          ctx.ellipse(-26, 42 + beatBob, 10, 6, 0, 0, Math.PI * 2);
          ctx.ellipse(34, 42 + beatBob, 10, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        drawChibiCharacter(
          ctx,
          character,
          currentExpression,
          isBlinkingRef.current,
          breatheTimeRef.current,
          isEarTwitching,
          mousePos,
          physics.state.isDragging,
          beatBob
        );
      }



      ctx.restore(); // restores character save

      ctx.restore(); // restores outer DPR scale

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [character, petEnabled, musicEnabled, hangingEnabled, currentExpression, mousePos, spawnParticle, onExpressionChange]);

  // Update and render floating particles (Notes, Hearts, Zzz, Sparkles)
  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, _dt: number) => {
    const list = particlesRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);
      ctx.globalAlpha = p.alpha;

      if (p.type === 'note') {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(p.id % 2 === 0 ? '♪' : '♫', 0, 0);
      } else if (p.type === 'heart') {
        ctx.fillStyle = p.color;
        ctx.font = '18px sans-serif';
        ctx.fillText('♥', 0, 0);
      } else if (p.type === 'zzz') {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 16px "Comic Sans MS", cursive, sans-serif';
        ctx.fillText('Zzz', 0, 0);
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (p.life >= p.maxLife) {
        list.splice(i, 1);
      }
    }
  };

  // --- Render Hanging Thread ---
  const drawThread = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    char: CharacterConfig
  ) => {
    ctx.save();

    // 1. Anchor Pin at top screen edge
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(x0, y0 + 3, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x0 - 2, y0 + 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hanging Thread Line (with slight natural catenary curve)
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 4);

    const midX = (x0 + x1) / 2 + Math.sin(physicsRef.current.state.angle) * 8;
    const midY = (y0 + y1) / 2;

    ctx.quadraticCurveTo(midX, midY, x1, y1 - 25);

    ctx.lineWidth = char.threadType === 'golden_wire' ? 2 : 2.5;

    if (char.threadType === 'golden_wire') {
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#eab308');
      grad.addColorStop(1, '#ca8a04');
      ctx.strokeStyle = grad;
      ctx.shadowColor = 'rgba(234, 179, 8, 0.4)';
      ctx.shadowBlur = 4;
    } else if (char.threadType === 'neon_cyan') {
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
    } else if (char.threadType === 'twilight_purple') {
      ctx.strokeStyle = '#c084fc';
      ctx.shadowColor = 'rgba(192, 132, 252, 0.5)';
      ctx.shadowBlur = 6;
    } else if (char.threadType === 'invisible') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    } else {
      // Crimson Silk (default)
      ctx.strokeStyle = char.threadColor || '#f43f5e';
      ctx.shadowColor = 'rgba(244, 63, 94, 0.3)';
      ctx.shadowBlur = 3;
    }

    ctx.stroke();

    // 3. Thread Tie / Small Bow at character connection point
    ctx.fillStyle = char.threadColor || '#f43f5e';
    ctx.beginPath();
    ctx.arc(x1, y1 - 25, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // --- Render Chibi Character ---
  const drawChibiCharacter = (
    ctx: CanvasRenderingContext2D,
    char: CharacterConfig,
    expr: ExpressionType,
    isBlinking: boolean,
    breatheTime: number,
    isEarTwitching: boolean,
    mouse: { x: number; y: number },
    isDragging: boolean,
    beatBob: number
  ) => {
    const breathY = Math.sin(breatheTime * 2.2) * 2.5 + beatBob;
    const legSway = Math.sin(breatheTime * 3) * 3;

    // --- 1. Dangling Little Legs ---
    ctx.save();
    ctx.translate(0, 48 + breathY);

    // Left Leg
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-16 + legSway * 0.4, 0, 10, 18, 4);
    ctx.fill();
    // Left Shoe
    ctx.fillStyle = char.hoodieAccent;
    ctx.beginPath();
    ctx.roundRect(-17 + legSway * 0.4, 14, 12, 7, 3);
    ctx.fill();

    // Right Leg
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(6 - legSway * 0.4, 0, 10, 18, 4);
    ctx.fill();
    // Right Shoe
    ctx.fillStyle = char.hoodieAccent;
    ctx.beginPath();
    ctx.roundRect(5 - legSway * 0.4, 14, 12, 7, 3);
    ctx.fill();

    ctx.restore();

    // --- 2. Back Hair Layer (Behind Head & Body) ---
    drawBackHair(ctx, char);

    // --- 3. Oversized Hoodie Body ---
    ctx.save();
    ctx.translate(0, 18 + breathY);

    // Main Hoodie Torso
    ctx.fillStyle = char.hoodieColor;
    ctx.beginPath();
    ctx.roundRect(-30, 0, 60, 38, [14, 14, 20, 20]);
    ctx.fill();

    // Subtle Hoodie Shadow & Gradient
    const hoodieGrad = ctx.createLinearGradient(0, 0, 0, 38);
    hoodieGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    hoodieGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = hoodieGrad;
    ctx.beginPath();
    ctx.roundRect(-30, 0, 60, 38, [14, 14, 20, 20]);
    ctx.fill();

    // Front Pocket
    if (char.hoodiePocket) {
      ctx.fillStyle = char.hoodieAccent;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.roundRect(-18, 16, 36, 16, 6);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Hoodie Drawstrings (dangle with inertia)
    const stringSway = Math.sin(breatheTime * 3) * 2;
    ctx.strokeStyle = char.hoodieAccent;
    ctx.lineWidth = 2;
    // Left string
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.quadraticCurveTo(-11 + stringSway, 10, -10 + stringSway * 1.5, 18);
    ctx.stroke();
    // Right string
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.quadraticCurveTo(11 + stringSway, 10, 10 + stringSway * 1.5, 18);
    ctx.stroke();

    // Left Arm / Sleeve
    ctx.fillStyle = char.hoodieColor;
    ctx.beginPath();
    if (isDragging) {
      // Reaching up when picked up!
      ctx.roundRect(-36, -8, 14, 28, 8);
    } else {
      ctx.roundRect(-35, 4, 13, 26, 7);
    }
    ctx.fill();

    // Right Arm / Sleeve
    ctx.beginPath();
    if (isDragging) {
      ctx.roundRect(22, -8, 14, 28, 8);
    } else if (expr === 'happy' || expr === 'dancing') {
      // Waving hand!
      const waveAngle = Math.sin(breatheTime * 8) * 0.3;
      ctx.save();
      ctx.translate(26, 8);
      ctx.rotate(waveAngle);
      ctx.roundRect(0, -6, 14, 26, 7);
      ctx.fill();
      // Little cute paw
      ctx.fillStyle = char.skinTone;
      ctx.beginPath();
      ctx.arc(7, 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.roundRect(22, 4, 13, 26, 7);
      ctx.fill();
    }

    ctx.restore();

    // --- 4. Chibi Head & Face ---
    ctx.save();
    ctx.translate(0, -8 + breathY * 0.7);

    // Chibi Head Base (soft round face)
    ctx.fillStyle = char.skinTone;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft Blush Cheeks
    const isBlushing = expr === 'happy' || expr === 'dancing' || isHovered;
    ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-22, 6, isBlushing ? 8 : 6, isBlushing ? 5 : 4, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 6, isBlushing ? 8 : 6, isBlushing ? 5 : 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cat / Bunny Ears / Headset (drawn on head)
    drawAccessories(ctx, char, isEarTwitching);

    // Front Hair Bangs
    drawFrontHair(ctx, char);

    // Eyes
    drawEyes(ctx, char, expr, isBlinking, mouse);

    // Mouth
    drawMouth(ctx, expr, isDragging);

    ctx.restore();
  };

  // --- Accessories (Cat Ears, Bunny Ears, Halo, Headset) ---
  const drawAccessories = (ctx: CanvasRenderingContext2D, char: CharacterConfig, twitch: boolean) => {
    const hasCatEars = char.accessories.includes('cat_ears');
    const hasBunnyEars = char.accessories.includes('bunny_ears');
    const hasHalo = char.accessories.includes('halo');
    const hasHeadset = char.accessories.includes('headset');

    if (hasCatEars) {
      // Left Ear
      ctx.save();
      ctx.translate(-24, -26);
      if (twitch) ctx.rotate(-0.15);
      ctx.fillStyle = char.hairColor;
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(-4, -18);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();

      // Inner Ear Pink
      ctx.fillStyle = char.accessoryColor || '#fb7185';
      ctx.beginPath();
      ctx.moveTo(-7, 8);
      ctx.lineTo(-3, -12);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Right Ear
      ctx.save();
      ctx.translate(24, -26);
      if (twitch) ctx.rotate(0.12);
      ctx.fillStyle = char.hairColor;
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.lineTo(4, -18);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();

      // Inner Ear Pink
      ctx.fillStyle = char.accessoryColor || '#fb7185';
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.lineTo(3, -12);
      ctx.lineTo(7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (hasBunnyEars) {
      // Left Bunny Ear
      ctx.fillStyle = char.hairColor;
      ctx.beginPath();
      ctx.ellipse(-16, -42, 9, 24, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = char.accessoryColor || '#fb7185';
      ctx.beginPath();
      ctx.ellipse(-16, -42, 5, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Right Bunny Ear
      ctx.fillStyle = char.hairColor;
      ctx.beginPath();
      ctx.ellipse(16, -42, 9, 24, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = char.accessoryColor || '#fb7185';
      ctx.beginPath();
      ctx.ellipse(16, -42, 5, 18, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hasHalo) {
      ctx.save();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, -36, 26, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (hasHeadset) {
      ctx.save();
      // Band over head
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -10, 36, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Left Ear Cup
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-42, -10, 10, 22, 5);
      ctx.fill();
      ctx.fillStyle = char.accessoryColor || '#06b6d4';
      ctx.beginPath();
      ctx.arc(-37, 1, 4, 0, Math.PI * 2);
      ctx.fill();

      // Right Ear Cup
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(32, -10, 10, 22, 5);
      ctx.fill();
      ctx.fillStyle = char.accessoryColor || '#06b6d4';
      ctx.beginPath();
      ctx.arc(37, 1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // --- Hair Layers ---
  const drawBackHair = (ctx: CanvasRenderingContext2D, char: CharacterConfig) => {
    ctx.save();
    ctx.fillStyle = char.hairColor;

    if (char.hairStyle === 'twintails') {
      // Left Twintail
      ctx.beginPath();
      ctx.moveTo(-28, -8);
      ctx.quadraticCurveTo(-46, 20, -36, 48);
      ctx.quadraticCurveTo(-26, 32, -22, 8);
      ctx.closePath();
      ctx.fill();

      // Right Twintail
      ctx.beginPath();
      ctx.moveTo(28, -8);
      ctx.quadraticCurveTo(46, 20, 36, 48);
      ctx.quadraticCurveTo(26, 32, 22, 8);
      ctx.closePath();
      ctx.fill();
    } else if (char.hairStyle === 'flowing') {
      ctx.beginPath();
      ctx.moveTo(-36, -10);
      ctx.quadraticCurveTo(-44, 30, -28, 55);
      ctx.lineTo(28, 55);
      ctx.quadraticCurveTo(44, 30, 36, -10);
      ctx.closePath();
      ctx.fill();
    } else if (char.hairStyle === 'bob') {
      ctx.beginPath();
      ctx.arc(0, -6, 40, 0, Math.PI);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawFrontHair = (ctx: CanvasRenderingContext2D, char: CharacterConfig) => {
    ctx.save();
    ctx.fillStyle = char.hairColor;

    // Top hair volume
    ctx.beginPath();
    ctx.ellipse(0, -18, 38, 22, 0, Math.PI, 0);
    ctx.fill();

    // Cute bangs
    ctx.beginPath();
    ctx.moveTo(-34, -14);
    ctx.quadraticCurveTo(-20, 2, -14, -6);
    ctx.quadraticCurveTo(-6, 6, 0, -8);
    ctx.quadraticCurveTo(8, 6, 14, -6);
    ctx.quadraticCurveTo(22, 2, 34, -14);
    ctx.closePath();
    ctx.fill();

    // Hair Highlight Shimmer
    ctx.fillStyle = char.hairHighlight || 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, -26, 24, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // --- Expressive Eyes & Pupil Mouse Tracking ---
  const drawEyes = (
    ctx: CanvasRenderingContext2D,
    char: CharacterConfig,
    expr: ExpressionType,
    isBlinking: boolean,
    mouse: { x: number; y: number }
  ) => {
    ctx.save();

    // Mouse Tracking pupil offset (within -3 to +3 px)
    const petX = physicsRef.current.state.bobX;
    const petY = physicsRef.current.state.bobY;
    const dx = mouse.x - petX;
    const dy = mouse.y - petY;
    const dist = Math.hypot(dx, dy);
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;
    if (dist > 10 && dist < 600) {
      pupilOffsetX = (dx / dist) * 2.8;
      pupilOffsetY = (dy / dist) * 2.2;
    }

    if (isBlinking || expr === 'sleepy') {
      // Closed / Sleepy Eyes: curved cute happy eyelash line
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      // Left Eye
      ctx.beginPath();
      ctx.arc(-16, 2, 8, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      // Right Eye
      ctx.beginPath();
      ctx.arc(16, 2, 8, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (expr === 'happy' || expr === 'dancing') {
      // Inverted happy smile eye curves ^_^
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.arc(-16, 5, 8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(16, 5, 8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (expr === 'dizzy') {
      // Comic Spiral Eyes @ . @
      const drawSpiral = (cx: number, cy: number) => {
        ctx.strokeStyle = char.eyeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.2) {
          const r = a * 1.4;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      drawSpiral(-16, 2);
      drawSpiral(16, 2);
    } else {
      // Normal Anime Chibi Eyes with sparkles
      const drawEye = (cx: number, cy: number) => {
        // White sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 9, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris gradient
        const irisGrad = ctx.createLinearGradient(cx, cy - 10, cx, cy + 10);
        irisGrad.addColorStop(0, char.eyeColor);
        irisGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(cx + pupilOffsetX, cy + pupilOffsetY, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Big Upper Sparkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + pupilOffsetX - 2.5, cy + pupilOffsetY - 3.5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Small Lower Sparkle
        ctx.beginPath();
        ctx.arc(cx + pupilOffsetX + 2.5, cy + pupilOffsetY + 3.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Upper Eyelash line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 3, 9, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      };

      drawEye(-16, 2);
      drawEye(16, 2);
    }

    ctx.restore();
  };

  // --- Cute Mouth ---
  const drawMouth = (ctx: CanvasRenderingContext2D, expr: ExpressionType, isDragging: boolean) => {
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    if (isDragging || expr === 'surprised') {
      // Little open circle ':o'
      ctx.arc(0, 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (expr === 'happy' || expr === 'dancing') {
      // Cute cat mouth :3
      ctx.arc(-3, 14, 3, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, 14, 3, 0, Math.PI);
      ctx.stroke();
    } else if (expr === 'sleepy') {
      // Tiny flat line
      ctx.moveTo(-3, 15);
      ctx.lineTo(3, 15);
      ctx.stroke();
    } else {
      // Subtle smiling arc
      ctx.arc(0, 14, 4.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  };

  // --- Cute Top Screen Pin (shown when pet is hidden so user can re-open settings) ---
  const drawHiddenPin = (ctx: CanvasRenderingContext2D, aX: number) => {
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(aX - 22, 0, 44, 20, [0, 0, 10, 10]);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(aX, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧵', aX, 10);
    ctx.restore();
  };



  // Helper: Test if mouse is over Character, Thread, or Anchor Pin
  const isInsideCharacterOrThread = (x: number, y: number) => {
    const petX = physicsRef.current.state.bobX;
    const petY = physicsRef.current.state.bobY;
    const anchorX = physicsRef.current.state.anchorX;
    const scale = character.scale || 1.0;

    // 1. Character body rectangle (generous 280px width, 290px height)
    const inBody =
      x >= petX - 140 * scale &&
      x <= petX + 140 * scale &&
      y >= petY - 60 * scale &&
      y <= petY + 230 * scale;

    // 2. Top anchor pin (top edge of screen)
    const inAnchor = Math.hypot(x - anchorX, y - 8) < 45;

    // 3. Thread line distance
    const dx = petX - anchorX;
    const dy = petY;
    const threadLen = Math.hypot(dx, dy);
    let inThread = false;
    if (threadLen > 10 && y >= 0 && y <= petY) {
      const t = Math.max(0, Math.min(1, ((x - anchorX) * dx + y * dy) / (threadLen * threadLen)));
      const projX = anchorX + t * dx;
      const projY = t * dy;
      inThread = Math.hypot(x - projX, y - projY) < 36;
    }

    return inBody || inAnchor || inThread;
  };

  // --- Mouse & Touch Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    audioEngine.resumeContext();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const currentAnchorX = physicsRef.current.state.anchorX;
    const petX = physicsRef.current.state.bobX;
    const petY = physicsRef.current.state.bobY;

    if (!petEnabled) return;

    // Top anchor pin drag
    if (Math.hypot(x - currentAnchorX, y - 6) < 32) {
      isDraggingAnchorRef.current = true;
      audioEngine.playChime('touch');
      return;
    }

    // Character body click (drag or click/double-click reaction)
    if (isInsideCharacterOrThread(x, y)) {
      const now = performance.now();
      const lastTime = lastClickTimeRef.current;
      const lastPos = lastClickPosRef.current;

      // Software Double-Tap / Double-Click:
      // If second click arrives within 380ms and within 40px -> OPEN SETTINGS!
      if (now - lastTime < 380 && lastPos && Math.hypot(x - lastPos.x, y - lastPos.y) < 40) {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        lastClickTimeRef.current = 0;
        lastClickPosRef.current = null;
        dragStartPosRef.current = null;
        audioEngine.playChime('wake');
        onPetDoubleClick?.(petX, petY);
        return;
      }

      lastClickTimeRef.current = now;
      lastClickPosRef.current = { x, y };
      dragStartPosRef.current = { x, y };

      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = window.setTimeout(() => {
        // If mouse was released without dragging, trigger single-click reaction
        if (dragStartPosRef.current === null && !physicsRef.current.state.isDragging) {
          audioEngine.playChime('touch');
          spawnParticle('heart', petX, petY - 40, '#f43f5e');
          onPetClick?.();
        }
      }, 230);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    audioEngine.resumeContext();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const petX = physicsRef.current.state.bobX;
    const petY = physicsRef.current.state.bobY;
    // Native double-click fallback
    if (isInsideCharacterOrThread(x, y) && petEnabled) {
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
      audioEngine.playChime('wake');
      onPetDoubleClick?.(petX, petY);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    audioEngine.resumeContext();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const petX = physicsRef.current.state.bobX;
    const petY = physicsRef.current.state.bobY;
    // Right-click on character = open settings
    if (isInsideCharacterOrThread(x, y) && petEnabled) {
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
      audioEngine.playChime('wake');
      onPetDoubleClick?.(petX, petY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Handle Anchor sliding across screen
    if (isDraggingAnchorRef.current) {
      const clampedX = Math.max(25, Math.min(window.innerWidth - 25, x));
      physicsRef.current.setAnchor(clampedX, 0);
      onAnchorXChange?.(clampedX);
      return;
    }

    const currentAnchorX = physicsRef.current.state.anchorX;
    setIsHoveringAnchor(Math.hypot(x - currentAnchorX, y - 4) < 25);
    setIsHovered(isInsideCharacterOrThread(x, y));

    // Only start dragging physics if mouse moved more than 7px threshold
    if (dragStartPosRef.current && !physicsRef.current.state.isDragging) {
      const dist = Math.hypot(x - dragStartPosRef.current.x, y - dragStartPosRef.current.y);
      if (dist > 7) {
        physicsRef.current.startDrag(dragStartPosRef.current.x, dragStartPosRef.current.y);
        dragStartPosRef.current = null;
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        setCurrentExpression('surprised');
        onExpressionChange?.('surprised');
        inactivityTimerRef.current = 0;
      }
    }

    if (physicsRef.current.state.isDragging) {
      // Cancel single-click timer when dragging begins
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      const { isShaking } = physicsRef.current.updateDrag(x, y, character.threadLength);
      inactivityTimerRef.current = 0;

      if (isShaking) {
        setCurrentExpression('dizzy');
        onExpressionChange?.('dizzy');
        audioEngine.playChime('whoosh');
        if (dizzyTimeoutRef.current) clearTimeout(dizzyTimeoutRef.current);
        dizzyTimeoutRef.current = window.setTimeout(() => {
          setCurrentExpression('idle');
          onExpressionChange?.('idle');
        }, 2500);
      }
    }
  };

  const handleMouseUp = () => {
    dragStartPosRef.current = null;
    if (isDraggingAnchorRef.current) {
      isDraggingAnchorRef.current = false;
      audioEngine.playChime('purr');
    }

    if (physicsRef.current.state.isDragging) {
      physicsRef.current.releaseDrag(character.threadLength);
      audioEngine.playChime('purr');
      spawnParticle('sparkle', physicsRef.current.state.bobX, physicsRef.current.state.bobY, '#fbbf24');
      if (currentExpression !== 'dizzy') {
        setCurrentExpression('happy');
        onExpressionChange?.('happy');
        setTimeout(() => {
          setCurrentExpression('idle');
          onExpressionChange?.('idle');
        }, 1800);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    audioEngine.resumeContext();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const petX = physicsRef.current.state.bobX;
    const petY = physicsRef.current.state.bobY;

    if (!petEnabled) return;

    if (isInsideCharacterOrThread(x, y)) {
      const now = performance.now();
      const lastTime = lastClickTimeRef.current;
      const lastPos = lastClickPosRef.current;

      if (now - lastTime < 400 && lastPos && Math.hypot(x - lastPos.x, y - lastPos.y) < 45) {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        lastClickTimeRef.current = 0;
        lastClickPosRef.current = null;
        audioEngine.playChime('wake');
        onPetDoubleClick?.(petX, petY);
        return;
      }

      lastClickTimeRef.current = now;
      lastClickPosRef.current = { x, y };

      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = window.setTimeout(() => {
        audioEngine.playChime('touch');
        spawnParticle('heart', petX, petY - 40, '#f43f5e');
        onPetClick?.();
      }, 230);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onClick={(e) => {
        // When settings popup is open, stop canvas clicks from propagating to window
        // (prevents outside-click handler from closing the popup)
        if (isPopupOpen) e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
        zIndex: 50,
        cursor: isDraggingAnchorRef.current || isHoveringAnchor
          ? 'ew-resize'
          : isHovered
          ? physicsRef.current.state.isDragging
            ? 'grabbing'
            : 'grab'
          : 'default',
      }}
    />
  );
};
