import { useEffect, useRef } from 'react';

interface SpectrumAnalyzerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  active?: boolean;
  targetFps?: number;
}

export function SpectrumAnalyzer({
  analyser,
  isPlaying,
  active = true,
  targetFps = 30,
}: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    syncCanvasSize();

    if (!active || !isPlaying) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      return;
    }

    const binCount = analyser.frequencyBinCount;
    const data = new Uint8Array(binCount);
    const barCount = 48;
    const minFrameMs = 1000 / Math.max(1, targetFps);
    let lastFrame = 0;

    const draw = (now: number) => {
      animFrameRef.current = requestAnimationFrame(draw);
      if (now - lastFrame < minFrameMs) return;
      lastFrame = now;

      syncCanvasSize();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);

      analyser.getByteFrequencyData(data);
      const css = getComputedStyle(document.documentElement);
      const waveformColor = css.getPropertyValue('--viz-waveform').trim() || '#8cb6f5';
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i += 1) {
        const start = Math.floor((i / barCount) * binCount);
        const end = Math.floor(((i + 1) / barCount) * binCount);
        let sum = 0;
        let count = 0;
        for (let j = start; j < end; j += 1) {
          sum += data[j] ?? 0;
          count += 1;
        }
        const avg = count > 0 ? sum / count : 0;
        const normalized = avg / 255;
        const barHeight = Math.max(1, normalized * (height - 2));
        const x = i * barWidth + 0.6;
        const y = height - barHeight;

        ctx.fillStyle = `${waveformColor}${normalized > 0.65 ? 'ff' : 'cc'}`;
        ctx.fillRect(x, y, Math.max(1, barWidth - 1.2), barHeight);
      }
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [active, analyser, isPlaying, targetFps]);

  return (
    <div className="sk-panel rounded-xl border border-cosmic-light-teal/30 bg-cosmic-teal/10 p-3">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-cosmic-light-teal/70">
        Spectrum
      </div>
      <canvas ref={canvasRef} className="h-24 w-full rounded-lg border border-cosmic-light-teal/25 bg-cosmic-teal/15" />
    </div>
  );
}
