
import React, { useEffect, useRef } from 'react';
import { Emotion } from '../types';

interface FluidSphereProps {
  emotion: Emotion;
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  moodScore: number; // 0 to 100
  isThinkingOfProactiveAction?: boolean;
  vocalIntensity?: number; // 0 to 1
}

const FluidSphere: React.FC<FluidSphereProps> = ({ 
  emotion, 
  isListening, 
  isSpeaking, 
  isConnecting,
  moodScore,
  isThinkingOfProactiveAction = false,
  vocalIntensity = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Estado persistente para controle de animação, toque e "memória" do fluido
  const stateRef = useRef({
    time: 0,
    currentH: 200,
    currentS: 10,
    currentL: 90,
    visualIntensity: 0, 
    eyeBlink: 0,
    blinkTimer: 0,
    mouthArtic: 0,
    mouthOpenAmount: 0,
    noiseOffsets: Array.from({ length: 8 }, () => Math.random() * 1000),
    // Estados de Toque Refinados
    touchX: 0,
    touchY: 0,
    touchActive: false,
    touchIntensity: 0, // 0 a 1
    touchVelocity: 0,
    ripplePhase: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    glowPulse: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numPoints = 120;
    const baseRadius = 115;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const updateTouchPos = (clientX: number, clientY: number, force: number = 0.5) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.touchX = (clientX - rect.left) * scaleX;
      stateRef.current.touchY = (clientY - rect.top) * scaleY;
      if (!stateRef.current.touchActive) stateRef.current.touchVelocity = force * 0.5;
      stateRef.current.touchActive = true;
    };

    const handleStart = (e: TouchEvent | MouseEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const force = 'touches' in e ? (e.touches[0].force || 0.5) : 0.8;
      updateTouchPos(clientX, clientY, force);
    };

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!stateRef.current.touchActive) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      updateTouchPos(clientX, clientY);
    };

    const handleEnd = () => {
      stateRef.current.touchActive = false;
      stateRef.current.lastTouchX = stateRef.current.touchX;
      stateRef.current.lastTouchY = stateRef.current.touchY;
    };

    canvas.addEventListener('touchstart', handleStart, { passive: true });
    canvas.addEventListener('touchmove', handleMove, { passive: true });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    const getEmotionConfig = (e: Emotion) => {
      switch (e) {
        case Emotion.HAPPY: return { h: 60, s: 90, l: 60 };
        case Emotion.SAD: return { h: 210, s: 70, l: 40 };
        case Emotion.CURIOUS: return { h: 280, s: 80, l: 65 };
        case Emotion.CONCERNED: return { h: 25, s: 90, l: 55 };
        case Emotion.EXCITED: return { h: 330, s: 95, l: 60 };
        default: return { h: 180, s: 20, l: 85 };
      }
    };

    const animate = () => {
      const state = stateRef.current;
      const isInternalState = isThinkingOfProactiveAction || isConnecting;
      
      const target = isThinkingOfProactiveAction 
        ? { h: 45, s: 100, l: 60 } 
        : getEmotionConfig(emotion);

      // Transições de Cor
      let deltaH = target.h - state.currentH;
      if (deltaH > 180) deltaH -= 360;
      if (deltaH < -180) deltaH += 360;
      state.currentH += deltaH * 0.05;
      state.currentS += (target.s - state.currentS) * 0.05;
      state.currentL += (target.l - state.currentL) * 0.05;
      
      state.visualIntensity += (vocalIntensity - state.visualIntensity) * (isSpeaking ? 0.4 : 0.2);
      
      const targetIntensity = state.touchActive ? 1.0 : 0.0;
      state.touchVelocity += (targetIntensity - state.touchIntensity) * 0.15;
      state.touchVelocity *= 0.82;
      state.touchIntensity += state.touchVelocity;

      const timeScale = 1.0 + (state.visualIntensity * 2.0) + (Math.abs(state.touchIntensity) * 0.5) + (isInternalState ? 0.5 : 0);
      state.time += 0.012 * timeScale;
      state.ripplePhase += 0.06 * timeScale;
      state.glowPulse = Math.sin(state.time * 2) * 0.5 + 0.5;

      // Boca e Olhos
      if (isSpeaking) {
        const chatter = Math.abs(Math.sin(state.time * 18)) * 0.5 + 0.5;
        state.mouthOpenAmount += (state.visualIntensity * 55 * chatter - state.mouthOpenAmount) * 0.6;
        state.mouthArtic = Math.sin(state.time * 8) * 0.3 + 0.7;
      } else {
        state.mouthOpenAmount *= 0.7;
        state.mouthArtic *= 0.8;
      }

      state.blinkTimer--;
      if (state.blinkTimer <= 0) { state.eyeBlink = 1; state.blinkTimer = Math.random() * 250 + 120; }
      if (state.eyeBlink > 0) state.eyeBlink -= 0.12;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const points: { x: number; y: number }[] = [];
      const intensityAbs = Math.abs(state.touchIntensity);
      const turbulence = 0.5 + state.visualIntensity * 3.5 + intensityAbs * 2.0 + (isInternalState ? 1.5 : 0);
      
      const tX = state.touchActive ? state.touchX : state.lastTouchX;
      const tY = state.touchActive ? state.touchY : state.lastTouchY;

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        let noise = 0;
        const layers = [{ f: 1.0, a: 18, t: 1.1 }, { f: 2.5, a: 10, t: 2.2 }, { f: 6.0, a: 6, t: 3.8 }, { f: 12.0, a: 3 * turbulence, t: 7.5 }];
        layers.forEach((layer, idx) => {
          const offset = state.noiseOffsets[idx];
          noise += Math.sin(angle * layer.f + state.time * layer.t + offset) * layer.a;
        });

        const pointX = centerX + Math.cos(angle) * baseRadius;
        const pointY = centerY + Math.sin(angle) * baseRadius;
        const distToTouch = Math.hypot(pointX - tX, pointY - tY);
        
        if (intensityAbs > 0.001) {
          const influence = Math.exp(-distToTouch / (150 + intensityAbs * 80));
          const ripple = Math.sin(distToTouch * 0.04 - state.ripplePhase * 2.5) * 18;
          noise += (influence * 40 * state.touchIntensity) + (influence * ripple * state.touchIntensity);
        }

        const radius = baseRadius + noise + (isListening ? Math.sin(state.time * 4) * 4 : 0);
        points.push({ x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius });
      }

      // Corpo
      ctx.beginPath();
      ctx.moveTo((points[0].x + points[numPoints - 1].x) / 2, (points[0].y + points[numPoints - 1].y) / 2);
      for (let i = 0; i < numPoints; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % numPoints];
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      }
      ctx.closePath();

      // BRILHO EXTERNO (GLOW)
      let glowColor1, glowColor2;
      let finalGlowSize = 40 + state.visualIntensity * 90 + intensityAbs * 60;
      
      if (isInternalState) {
        finalGlowSize += 60 + state.glowPulse * 40;
        glowColor1 = `rgba(255, 255, 255, ${0.8 + state.glowPulse * 0.2})`; // Branco pulsante
        glowColor2 = `rgba(0, 242, 255, ${0.6 + state.glowPulse * 0.3})`; // Azul Elétrico
        ctx.shadowColor = "rgba(0, 242, 255, 0.8)";
      } else {
        glowColor1 = `hsla(${state.currentH}, ${state.currentS}%, ${state.currentL}%, 0.98)`;
        glowColor2 = `hsla(${state.currentH}, ${state.currentS}%, ${Math.min(100, state.currentL + 30)}%, 0.6)`;
        ctx.shadowColor = glowColor2;
      }

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius + 200 + (isInternalState ? 50 : 0));
      gradient.addColorStop(0, glowColor1);
      gradient.addColorStop(0.3, glowColor2);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.shadowBlur = finalGlowSize;
      ctx.fillStyle = gradient;
      ctx.fill();

      // Rosto
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
      const eyeOffset = 36;
      const faceFloatY = Math.sin(state.time * 0.6) * 7;
      let faceXOffset = 0, faceYOffset = 0;
      if (intensityAbs > 0.1) {
        const dx = tX - centerX, dy = tY - centerY, dist = Math.hypot(dx, dy);
        const pull = Math.min(15, dist * 0.05) * state.touchIntensity;
        faceXOffset = (dx / (dist || 1)) * pull;
        faceYOffset = (dy / (dist || 1)) * pull;
      }

      const eyeY = centerY - 15 + faceFloatY + faceYOffset;
      const blinkScale = state.eyeBlink > 0 ? (1 - state.eyeBlink) : 1;

      const drawEye = (x: number) => {
        ctx.save();
        ctx.translate(x + faceXOffset, eyeY);
        if (emotion === Emotion.HAPPY) {
          ctx.beginPath(); ctx.arc(0, 5, 12, Math.PI, 0, false);
          ctx.lineWidth = 4.5; ctx.strokeStyle = "white"; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.ellipse(0, 0, 11, 15 * blinkScale, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      };
      drawEye(centerX - eyeOffset);
      drawEye(centerX + eyeOffset);

      const mouthY = centerY + 38 + faceFloatY + faceYOffset;
      ctx.save(); ctx.translate(centerX + faceXOffset, mouthY);
      if (isSpeaking || state.mouthOpenAmount > 0.5) {
        const w = 28 + (state.mouthArtic * 15) + (state.visualIntensity * 12);
        const emotionalShift = emotion === Emotion.HAPPY ? 5 : (emotion === Emotion.SAD ? -3 : 0);
        ctx.shadowBlur = 15 + state.visualIntensity * 25; ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath(); ctx.lineWidth = 3.5 + state.visualIntensity * 2; ctx.strokeStyle = "white";
        ctx.moveTo(-w/2, emotionalShift);
        ctx.bezierCurveTo(-w/4, -state.mouthOpenAmount/2 - 2 + emotionalShift, -3, -state.mouthOpenAmount/2 - 4 + emotionalShift, 0, -state.mouthOpenAmount/2 - 2 + emotionalShift);
        ctx.bezierCurveTo(3, -state.mouthOpenAmount/2 - 4 + emotionalShift, w/4, -state.mouthOpenAmount/2 - 2 + emotionalShift, w/2, emotionalShift);
        ctx.bezierCurveTo(w/2 * 0.8, state.mouthOpenAmount/2 + 4 + emotionalShift, -w/2 * 0.8, state.mouthOpenAmount/2 + 4 + emotionalShift, -w/2, emotionalShift);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + state.visualIntensity * 0.25})`; ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        if (emotion === Emotion.HAPPY) { ctx.moveTo(-22, -2); ctx.quadraticCurveTo(0, 18, 22, -2); }
        else if (emotion === Emotion.SAD) { ctx.moveTo(-18, 12); ctx.quadraticCurveTo(0, 2, 18, 12); }
        else { ctx.moveTo(-16, 0); ctx.bezierCurveTo(-6, 3, 6, 3, 16, 0); }
        ctx.stroke();
      }
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [emotion, isListening, isSpeaking, isConnecting, moodScore, isThinkingOfProactiveAction, vocalIntensity]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="max-w-full max-h-full transition-all duration-1000 cursor-pointer pointer-events-auto"
        style={{ filter: 'drop-shadow(0 0 50px rgba(255,255,255,0.15))', touchAction: 'none' }}
      />
    </div>
  );
};

export default FluidSphere;
