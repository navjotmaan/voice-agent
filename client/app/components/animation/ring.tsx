import React from "react";

/**
 * AudioOrb
 * A glowing cluster of organic, flowing ring shapes (not perfect circles) with a
 * centered audio-waveform glyph. Pure SVG + Tailwind, no external libraries.
 *
 * Usage:
 *   <AudioOrb />                 // default 260px orb
 *   <AudioOrb size={180} />      // smaller
 *   <AudioOrb animate={false} /> // static, no spin/pulse
 */

interface AudioOrbProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

// --- geometry helpers -------------------------------------------------

type Point = { x: number; y: number };

// Smooth a closed loop of points into an SVG path using quadratic curves
// through midpoints (classic dependency-free technique for organic blobs).
function smoothClosedPath(points: Point[]): string {
  const n = points.length;
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(points[n - 1], points[0]);
  let d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    const m = mid(curr, next);
    d += `Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${m.x.toFixed(2)} ${m.y.toFixed(2)} `;
  }
  return d + "Z";
}

// Generates a wobbly, "flowing" ring path instead of a perfect circle by
// modulating the radius with a couple of sine waves. Deterministic (no
// Math.random) so it's stable across renders/SSR.
function blobPath(cx: number, cy: number, baseR: number, amp: number, freq: number, phase: number, points = 30): string {
  const pts: Point[] = Array.from({ length: points }, (_, i) => {
    const t = (i / points) * Math.PI * 2;
    const r = baseR + amp * Math.sin(freq * t + phase) + amp * 0.4 * Math.sin(freq * 2 * t + phase * 1.6);
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  });
  return smoothClosedPath(pts);
}

// --- ring configuration -------------------------------------------------
// Centers are kept close together (small offsets) so the rings overlap
// tightly, like the reference image, rather than sitting far apart.

interface RingConfig {
  d: string;
  color: string;
  width: number;
  group: "cw" | "ccw";
}

const ringConfigs: RingConfig[] = [
  { d: blobPath(100, 94, 50, 3, 6, 0.3), color: "#d8b4fe", width: 11, group: "cw" },
  { d: blobPath(107, 103, 49, 5, 6, 2.1), color: "#a855f7", width: 12, group: "cw" },
  { d: blobPath(96, 103, 51, 4, 6, 3.4), color: "#946bf4", width: 10, group: "ccw" },
  { d: blobPath(110, 107, 47, 6, 6, 5.2), color: "#6831e8", width: 13, group: "ccw" },
];

// Waveform bar heights (px), matching the reference glyph's proportions.
const barHeights = [8, 14, 22, 32, 22, 38, 20, 28, 12, 18, 8];

export const AudioOrb: React.FC<AudioOrbProps> = ({
  size = 260,
  animate,
  className = "",
}) => {
  const cwRings = ringConfigs.filter((r) => r.group === "cw");
  const ccwRings = ringConfigs.filter((r) => r.group === "ccw");

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <style>{`
        @keyframes orb-spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orb-spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes orb-breathe { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes bar-wave { 0%, 100% { transform: scaleY(0.85); } 50% { transform: scaleY(1.15); } }
      `}</style>

      {/* ambient background wash */}
      <div
        className="absolute inset-0 rounded-full bg-purple-600/40 blur-3xl"
        style={animate ? { animation: "orb-breathe 5s ease-in-out infinite" } : undefined}
      />

      {/* ring cluster, thick + glowing + flowing */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full overflow-visible"
        style={{ filter: "drop-shadow(0 0 22px rgba(168,85,247,0.55))" }}
      >
        <defs>
          <filter id="ring-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ring-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          style={{
            transformOrigin: "100px 100px",
            mixBlendMode: "screen",
            animation: animate ? "orb-spin-cw 20s linear infinite" : undefined,
          }}
        >
          {cwRings.map((r, i) => (
            <g key={i}>
              <path d={r.d} fill="none" stroke={r.color} strokeWidth={r.width + 7} opacity={0.35} filter="url(#ring-glow)" />
              <path d={r.d} fill="none" stroke={r.color} strokeWidth={r.width} opacity={0.9} strokeLinejoin="round" filter="url(#ring-soft)" />
            </g>
          ))}
        </g>

        <g
          style={{
            transformOrigin: "100px 100px",
            mixBlendMode: "screen",
            animation: animate ? "orb-spin-ccw 24s linear infinite" : undefined,
          }}
        >
          {ccwRings.map((r, i) => (
            <g key={i}>
              <path d={r.d} fill="none" stroke={r.color} strokeWidth={r.width + 7} opacity={0.35} filter="url(#ring-glow)" />
              <path d={r.d} fill="none" stroke={r.color} strokeWidth={r.width} opacity={0.9} strokeLinejoin="round" filter="url(#ring-soft)" />
            </g>
          ))}
        </g>
      </svg>

      {/* sparkle / particle band, contained to a circle */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-purple-100"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              filter: "blur(0.5px)",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      {/* center waveform glyph, thin bars with a clear small gap */}
      <div
        className="relative z-10 flex items-center gap-[3px]"
        style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.85))" }}
      >
        {barHeights.map((h, i) => (
          <div
            key={i}
            className="w-[2px] rounded-full bg-white"
            style={{
              height: h,
              animation: animate ? `bar-wave 1.4s ease-in-out ${i * 0.09}s infinite` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Deterministic "sparkle" positions scattered along the ring band.
const PARTICLE_COUNT = 36;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 5) * 0.35;
  const radius = 30 + ((i * 7) % 18);
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle) * 0.95;
  const size = 1 + (i % 3);
  const opacity = 0.25 + (i % 4) * 0.15;
  return { x, y, size, opacity };
});

// Full-card version matching the reference screenshot (dark background + centered orb).
const AudioOrbCard: React.FC<{ className?: string, animate: boolean }> = ({ className = "", animate }) => {
  return (
    <div
      className={`relative flex h-full min-h-[300px] w-full items-center justify-center overflow-hidden rounded-[50%] bg-[#0a0714] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(181, 116, 237, 0.25),transparent_60%)]" />
      <AudioOrb size={300} animate={animate} />
    </div>
  );
};

export default AudioOrbCard;