import { useRef, useEffect } from 'react';

interface WaveformProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  active?: boolean;
  compact?: boolean;
  targetFps?: number;
}

export function Waveform({
  analyser,
  isPlaying,
  active = true,
  compact = false,
  targetFps = 36,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const waveColor = css.getPropertyValue('--viz-waveform').trim() || '#8cb6f5';
    const gridColor = css.getPropertyValue('--viz-grid').trim() || '#64707a';

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

    const drawFlatLine = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);
      // Background grid lines (retro feel)
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (!analyser || !isPlaying || !active) {
      drawFlatLine();
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
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

      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.lineWidth = compact ? 1.6 : 2;
      ctx.strokeStyle = waveColor;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.shadowBlur = compact ? 4 : 8;
      ctx.shadowColor = waveColor;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, analyser, compact, isPlaying, targetFps]);

  return (
    <div className="w-full">
      <div className="mb-1 font-mono text-xs uppercase tracking-wider text-cosmic-light-teal/60">Waveform</div>
      <canvas
        ref={canvasRef}
        className={`sk-wave-canvas w-full rounded-xl border border-cosmic-light-teal/30 bg-cosmic-teal/80 ${
          compact ? 'h-12' : 'h-20'
        }`}
      />
    </div>
  );
}
