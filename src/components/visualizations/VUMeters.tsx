import { useEffect, useRef } from 'react';

interface VUMetersProps {
  analyser: AnalyserNode | null;
  leftAnalyser?: AnalyserNode | null;
  rightAnalyser?: AnalyserNode | null;
  isPlaying: boolean;
  active?: boolean;
  targetFps?: number;
}

function getLevel(analyser: AnalyserNode, buffer: Uint8Array): number {
  analyser.getByteTimeDomainData(buffer);
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const sample = (buffer[i] - 128) / 128;
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / buffer.length);
  return Math.min(1, rms * 4.6);
}

export function VUMeters({
  analyser,
  leftAnalyser = null,
  rightAnalyser = null,
  isPlaying,
  active = true,
  targetFps = 36,
}: VUMetersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const levelsRef = useRef({ left: 0, right: 0, peakLeft: 0, peakRight: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const leftSource = leftAnalyser ?? analyser;
    const rightSource = rightAnalyser ?? analyser;
    if (!leftSource || !rightSource) return;

    const syncCanvasSize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawMeterRow = (y: number, label: 'L' | 'R', level: number, peak: number, width: number) => {
      const meterLeft = 18;
      const meterTop = y + 16;
      const meterWidth = width - 34;
      const meterHeight = 14;

      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(meterLeft, meterTop, meterWidth, meterHeight);
      ctx.strokeStyle = 'rgba(120,120,120,0.5)';
      ctx.strokeRect(meterLeft, meterTop, meterWidth, meterHeight);

      const tickCount = 24;
      ctx.fillStyle = 'rgba(180,180,180,0.15)';
      for (let i = 0; i < tickCount; i += 1) {
        const x = meterLeft + (i / tickCount) * meterWidth;
        ctx.fillRect(x, meterTop + 1, 1, meterHeight - 2);
      }

      const css = getComputedStyle(document.documentElement);
      const vuColor = css.getPropertyValue('--viz-vu').trim() || '#f0b078';
      const fillWidth = Math.max(0, Math.min(meterWidth, Math.round(level * meterWidth)));
      const gradient = ctx.createLinearGradient(meterLeft, meterTop, meterLeft + meterWidth, meterTop);
      gradient.addColorStop(0, `${vuColor}55`);
      gradient.addColorStop(0.6, `${vuColor}cc`);
      gradient.addColorStop(1, `${vuColor}`);
      ctx.fillStyle = gradient;
      ctx.fillRect(meterLeft, meterTop + 1, fillWidth, meterHeight - 2);

      const peakX = meterLeft + Math.max(0, Math.min(meterWidth - 1, Math.round(peak * meterWidth)));
      ctx.fillStyle = `${vuColor}`;
      ctx.fillRect(peakX, meterTop + 1, 2, meterHeight - 2);

      ctx.fillStyle = 'rgba(110, 110, 110, 0.95)';
      ctx.font = "11px 'SF Mono', monospace";
      ctx.fillText(label, 2, meterTop + meterHeight - 2);
      ctx.fillText(`${Math.round(level * 100)}%`, width - 30, meterTop + meterHeight - 2);
    };

    const leftBuffer = new Uint8Array(leftSource.fftSize);
    const rightBuffer = new Uint8Array(rightSource.fftSize);
    const minFrameMs = 1000 / Math.max(1, targetFps);
    let lastFrame = 0;

    const draw = (now: number) => {
      animFrameRef.current = requestAnimationFrame(draw);
      if (now - lastFrame < minFrameMs) return;
      lastFrame = now;

      syncCanvasSize();
      const { width } = canvas.getBoundingClientRect();
      const height = 80;

      const state = levelsRef.current;
      if (!active || !isPlaying) {
        state.left *= 0.84;
        state.right *= 0.84;
      } else {
        const rawLeft = getLevel(leftSource, leftBuffer);
        let rawRight = getLevel(rightSource, rightBuffer);
        if (rightAnalyser && rawRight < 0.02 && rawLeft > 0.05) {
          rawRight = rawLeft * 0.94;
        }
        state.left = rawLeft > state.left
          ? state.left + (rawLeft - state.left) * 0.4
          : state.left + (rawLeft - state.left) * 0.1;
        state.right = rawRight > state.right
          ? state.right + (rawRight - state.right) * 0.4
          : state.right + (rawRight - state.right) * 0.1;
      }

      state.peakLeft = Math.max(state.left, state.peakLeft * 0.985);
      state.peakRight = Math.max(state.right, state.peakRight * 0.985);

      ctx.clearRect(0, 0, width, height);
      drawMeterRow(0, 'L', state.left, state.peakLeft, width);
      drawMeterRow(38, 'R', state.right, state.peakRight, width);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, analyser, isPlaying, leftAnalyser, rightAnalyser, targetFps]);

  return (
    <div className="sk-panel w-full rounded-xl border border-cosmic-light-teal/30 bg-cosmic-teal/10 p-3">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-cosmic-light-teal/70">
        Stereo VU
      </div>
      <canvas ref={canvasRef} className="h-20 w-full rounded-lg border border-cosmic-light-teal/25 bg-cosmic-teal/15" />
    </div>
  );
}
