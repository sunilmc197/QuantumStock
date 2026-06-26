"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = 60;
    const connectionDist = 120;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < maxParticles; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: Math.random() * 2 + 1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // We'll read the global class of html/body to decide particle color (defaulting to cyber cyan/purple/blue)
      const isDark = document.documentElement.classList.contains("dark") || true;
      const dotColor = isDark ? "rgba(147, 51, 234, 0.4)" : "rgba(59, 130, 246, 0.3)";
      const lineColor = isDark ? "rgba(139, 92, 246, 0.08)" : "rgba(59, 130, 246, 0.06)";
      const hoverLineColor = isDark ? "rgba(6, 182, 212, 0.25)" : "rgba(6, 182, 212, 0.18)";

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Move
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bounce walls
        if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();

        // Connect with other dots
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connect with mouse
        const dx = p1.x - mouseRef.current.x;
        const dy = p1.y - mouseRef.current.y;
        const mDist = Math.sqrt(dx * dx + dy * dy);
        if (mDist < connectionDist + 30) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.strokeStyle = hoverLineColor;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 bg-slate-950 dark:bg-slate-950"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
