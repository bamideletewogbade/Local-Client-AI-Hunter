import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Zap, Activity, Cpu, ArrowRight } from 'lucide-react';

/**
 * NeuralFlowHero — Full-screen cinematic animated hero.
 * Renders a canvas-based neural network / synaptic firing animation
 * as the background, with an overlay of the product value proposition.
 */

// ─── Particle & Synapse Types ───

interface Neuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  energy: number; // 0-1, pulsing
  phase: number; // for wave effect
  connections: number[]; // indices of connected neurons
  label: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  fromN: number;
  toN: number;
  progress: number;
  color: string;
}

interface NeuralFlowHeroProps {
  onScrollDown?: () => void;
}

const NEURON_COUNT = 60;
const CONNECTION_RADIUS = 180;
const PARTICLE_SPEED = 0.02;

const NEURON_LABELS = [
  'SCAN', 'ANALYZE', 'SCORE', 'PITCH', 'CONVERT',
  'MAPS', 'CRM', 'AI', 'DATA', 'LEAD',
  'SCORE', 'AUDIT', 'DETECT', 'GROW', 'SALES',
];

export default function NeuralFlowHero({ onScrollDown }: NeuralFlowHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const neuronsRef = useRef<Neuron[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);
  const [activeLabel, setActiveLabel] = useState('CLIENT_HUNTER');
  const [glitchText, setGlitchText] = useState(false);

  // ─── Initialize neurons ───

  const initNeurons = useCallback((width: number, height: number) => {
    const neurons: Neuron[] = [];
    const padding = 60;
    const labelCount = NEURON_LABELS.length;

    for (let i = 0; i < NEURON_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * Math.min(width, height) * 0.4;
      const cx = width / 2;
      const cy = height / 2;

      neurons.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 2 + Math.random() * 5,
        energy: Math.random(),
        phase: Math.random() * Math.PI * 2,
        connections: [],
        label: NEURON_LABELS[i % labelCount],
      });
    }

    // Create connections (proximity-based)
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const dx = neurons[i].x - neurons[j].x;
        const dy = neurons[i].y - neurons[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_RADIUS && Math.random() < 0.3) {
          neurons[i].connections.push(j);
          neurons[j].connections.push(i);
        }
      }
    }

    neuronsRef.current = neurons;
  }, []);

  // ─── Spawn particle along a connection ───

  const spawnParticle = useCallback((neurons: Neuron[], fromIdx: number, toIdx: number) => {
    const from = neurons[fromIdx];
    const to = neurons[toIdx];
    if (!from || !to) return;

    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#6366f1', '#a855f7', '#0ea5e9'];
    particlesRef.current.push({
      x: from.x,
      y: from.y,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 60 + Math.random() * 60,
      fromN: fromIdx,
      toN: toIdx,
      progress: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }, []);

  // ─── Animation loop ───

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (neuronsRef.current.length === 0) {
        initNeurons(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let particleCounter = 0;
    const maxParticles = 120;

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Fade trail effect
      ctx.fillStyle = 'rgba(2, 6, 23, 0.15)';
      ctx.fillRect(0, 0, w, h);

      const neurons = neuronsRef.current;
      const particles = particlesRef.current;
      const time = Date.now() / 1000;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ─── Update neurons ───
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];

        // Movement with slight attraction to center
        const cx = w / 2;
        const cy = h / 2;
        const dxc = cx - n.x;
        const dyc = cy - n.y;
        const dc = Math.sqrt(dxc * dxc + dyc * dyc);
        if (dc > 10) {
          n.vx += (dxc / dc) * 0.002;
          n.vy += (dyc / dc) * 0.002;
        }

        // Mouse repulsion
        if (mx > 0) {
          const dxm = n.x - mx;
          const dym = n.y - my;
          const dm = Math.sqrt(dxm * dxm + dym * dym);
          if (dm < 150 && dm > 0) {
            const force = (150 - dm) / 150 * 0.5;
            n.vx += (dxm / dm) * force;
            n.vy += (dym / dm) * force;
          }
        }

        // Damping
        n.vx *= 0.98;
        n.vy *= 0.98;
        n.x += n.vx;
        n.y += n.vy;

        // Boundary wrap
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;

        // Energy pulse
        n.energy = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.5 + n.phase));

        // Spawn particles randomly along connections
        if (Math.random() < 0.008 && n.connections.length > 0 && particles.length < maxParticles) {
          const targetIdx = n.connections[Math.floor(Math.random() * n.connections.length)];
          spawnParticle(neurons, i, targetIdx);
        }
      }

      // ─── Spawn occasional random particles ───
      particleCounter++;
      if (particleCounter % 15 === 0 && particles.length < maxParticles) {
        const from = Math.floor(Math.random() * neurons.length);
        const to = Math.floor(Math.random() * neurons.length);
        if (from !== to && neurons[from] && neurons[to]) {
          spawnParticle(neurons, from, to);
        }
      }

      // ─── Draw connections ───
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        for (const j of n.connections) {
          const target = neurons[j];
          if (!target) continue;
          const dx = n.x - target.x;
          const dy = n.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_RADIUS) {
            const alpha = (1 - dist / CONNECTION_RADIUS) * 0.2 * n.energy;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 0.5 + n.energy * 0.5;
            ctx.stroke();
          }
        }
      }

      // ─── Update & draw particles ───
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const from = neurons[p.fromN];
        const to = neurons[p.toN];
        if (!from || !to) {
          particles.splice(i, 1);
          continue;
        }

        p.progress += PARTICLE_SPEED * (0.5 + Math.random() * 0.5);
        p.life++;

        if (p.progress >= 1 || p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        // Eased position
        const t = p.progress;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        p.x = from.x + (to.x - from.x) * ease;
        p.y = from.y + (to.y - from.y) * ease;

        // Glow
        const opacity = Math.sin(t * Math.PI) * 0.9;
        const radius = 1 + Math.sin(t * Math.PI) * 2.5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '15';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(opacity * 180).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // ─── Draw neurons ───
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        const glowRadius = n.radius * 3;
        const isActive = n.energy > 0.7;

        // Outer glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowRadius);
        const color = isActive ? '59, 130, 246' : '100, 116, 139';
        gradient.addColorStop(0, `rgba(${color}, ${0.3 * n.energy})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? `rgba(59, 130, 246, ${0.6 + n.energy * 0.4})`
          : `rgba(148, 163, 184, ${0.3 + n.energy * 0.3})`;
        ctx.fill();

        // Bright center
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * n.energy})`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [initNeurons, spawnParticle]);

  // ─── Glitch text effect ───

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchText(true);
      const labels = [
        'CLIENT_HUNTER', 'NEURAL_MESH', 'AI_ACQUISITION',
        'BISHOP_AGENT', 'LEAD_ENGINE',
      ];
      setActiveLabel(labels[Math.floor(Math.random() * labels.length)]);
      setTimeout(() => setGlitchText(false), 100);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseMove={(e) => {
          mouseRef.current.x = e.clientX;
          mouseRef.current.y = e.clientY;
          setIsHovering(true);
        }}
        onMouseLeave={() => {
          mouseRef.current.x = -1000;
          mouseRef.current.y = -1000;
          setIsHovering(false);
        }}
      />

      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />

      {/* Top-left scanning overlay */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <div className="absolute -inset-1.5 rounded-full bg-blue-500/20 animate-ping" />
          </div>
          <span className={`font-mono text-[10px] tracking-[0.3em] uppercase text-blue-400/70 transition-opacity duration-300 ${glitchText ? 'opacity-40' : 'opacity-70'}`}>
            Neural Mesh Active
          </span>
        </div>
      </div>

      {/* Top-right status */}
      <div className="absolute top-8 right-8 z-10 pointer-events-none">
        <span className="font-mono text-[9px] tracking-wider text-zinc-500/50 uppercase">
          v2.0 • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        {/* Glitch overlay line */}
        <div
          className={`h-px w-0 bg-blue-500/30 transition-all duration-1000 mb-8 ${
            glitchText ? 'w-3/4' : 'w-1/3'
          }`}
        />

        <div className="text-center space-y-6 max-w-4xl px-6">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5">
            <Activity className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-blue-300/80 uppercase font-bold">
              AI-Powered Acquisition Engine
            </span>
          </div>

          {/* Main headline */}
          <h1 className="relative">
            <span
              className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold font-display tracking-tight leading-none transition-all duration-150 ${
                glitchText ? 'opacity-80 translate-x-1' : 'opacity-100 translate-x-0'
              }`}
              style={{
                color: '#f1f5f9',
                textShadow: glitchText
                  ? '2px 0 #3b82f6, -2px 0 #8b5cf6'
                  : '0 0 40px rgba(59, 130, 246, 0.15)',
              }}
            >
              {activeLabel.split('_').map((word, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-blue-500/40 mx-2 font-light">/</span>}
                  {word}
                </span>
              ))}
            </span>
            {/* Glitch shadows */}
            <span
              className={`absolute inset-0 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold font-display tracking-tight leading-none text-blue-500/20 pointer-events-none transition-all duration-75 ${
                glitchText ? 'translate-x-1.5 opacity-100' : '-translate-x-0 opacity-0'
              }`}
              style={{ clipPath: 'inset(20% 0 40% 0)' }}
              aria-hidden
            >
              {activeLabel}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-zinc-400 font-light max-w-xl mx-auto leading-relaxed tracking-wide">
            Deploy an autonomous neural mesh of AI agents to discover, analyze,
            and convert local business leads. Real-time scanning. Automated outreach.
            Cinematic precision.
          </p>

          {/* Key metrics */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 pt-4">
            {[
              { value: '5', label: 'AI Agents' },
              { value: '50+', label: 'Cities' },
              { value: '< 2s', label: 'Scan Time' },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold font-display text-blue-400">
                  {metric.value}
                </p>
                <p className="text-[10px] font-mono tracking-wider text-zinc-500 mt-1 uppercase">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-6 pointer-events-auto">
            <button
              onClick={onScrollDown}
              className="group relative inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm px-6 sm:px-8 py-3.5 sm:py-4 uppercase tracking-wider transition-all duration-300 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              <span>Explore the Mesh</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="text-[10px] text-zinc-600 mt-3 font-mono tracking-wider">
              No credit card required • 100 free scans/month
            </p>
          </div>
        </div>

        {/* Bottom scan line */}
        <div
          className={`h-px w-0 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent transition-all duration-1000 mt-12 ${
            glitchText ? 'w-2/3' : 'w-1/4'
          }`}
        />
      </div>

      {/* Bottom-left corner info */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-none">
        <div className="flex items-center gap-3">
          <Cpu className="h-3.5 w-3.5 text-zinc-600" />
          <span className="font-mono text-[9px] text-zinc-600 tracking-wider">
            {Math.floor(NEURON_COUNT * 1.5)} SYNAPSES • {NEURON_COUNT} NEURONS
          </span>
        </div>
      </div>

      {/* Bottom-right scroll indicator */}
      <div className="absolute bottom-8 right-8 z-10 pointer-events-none">
        <div className="flex items-center gap-2 animate-bounce">
          <span className="font-mono text-[8px] text-zinc-600/50 tracking-[0.3em] uppercase">
            Scroll
          </span>
          <div className="w-4 h-[1px] bg-zinc-600/30" />
        </div>
      </div>
    </div>
  );
}
