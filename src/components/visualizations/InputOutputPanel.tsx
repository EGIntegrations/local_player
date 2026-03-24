import { useEffect, useRef, useState } from 'react';

interface InputOutputPanelProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  active?: boolean;
  preampDb: number;
  output: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function InputOutputPanel({
  analyser,
  isPlaying,
  active = true,
  preampDb,
  output,
}: InputOutputPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [isClipping, setIsClipping] = useState(false);
  const clippingRef = useRef(false);
  const levelRef = useRef(0);
  const peakRef = useRef(0);
  const clipHoldUntilRef = useRef(0);

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

    const buffer = new Uint8Array(analyser.fftSize);

    const drawStatic = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);
    };

    if (!active || !isPlaying) {
      drawStatic();
      return;
    }

    const draw = (now: number) => {
      animFrameRef.current = requestAnimationFrame(draw);
      syncCanvasSize();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);

      analyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;
      let clipDetected = false;
      for (let i = 0; i < buffer.length; i += 1) {
        const sample = (buffer[i] - 128) / 128;
        sumSquares += sample * sample;
        if (Math.abs(sample) >= 0.985) {
          clipDetected = true;
        }
      }
      const outputLevel = clamp(Math.sqrt(sumSquares / buffer.length) * 4.2, 0, 1);

      const prev = levelRef.current;
      levelRef.current = outputLevel > prev
        ? prev + (outputLevel - prev) * 0.45
        : prev + (outputLevel - prev) * 0.12;
      peakRef.current = Math.max(levelRef.current, peakRef.current * 0.985);

      if (clipDetected) {
        clipHoldUntilRef.current = now + 900;
      }
      const clipping = now < clipHoldUntilRef.current;
      if (clipping !== clippingRef.current) {
        clippingRef.current = clipping;
        setIsClipping(clipping);
      }

      const meterLeft = 8;
      const meterWidth = width - 16;
      const meterHeight = 11;

      const drawRow = (label: string, y: number, value: number, peak: number, colorVar: '--viz-waveform' | '--viz-vu') => {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(meterLeft, y, meterWidth, meterHeight);
        ctx.strokeStyle = 'rgba(120,120,120,0.5)';
        ctx.strokeRect(meterLeft, y, meterWidth, meterHeight);
        const css = getComputedStyle(document.documentElement);
        const color = css.getPropertyValue(colorVar).trim();
        ctx.fillStyle = `${color}cc`;
        ctx.fillRect(meterLeft + 1, y + 1, Math.max(0, Math.round(value * (meterWidth - 2))), meterHeight - 2);
        ctx.fillStyle = `${color}`;
        const peakX = meterLeft + Math.round(peak * meterWidth);
        ctx.fillRect(peakX, y + 1, 2, meterHeight - 2);
        ctx.fillStyle = 'rgba(110,110,110,0.95)';
        ctx.font = "10px 'SF Mono', monospace";
        ctx.fillText(label, meterLeft + 4, y - 2);
      };

      const inputLevel = clamp((preampDb + 12) / 24, 0, 1);
      drawRow('Input', 16, inputLevel, inputLevel, '--viz-waveform');
      drawRow('Output', 40, levelRef.current, peakRef.current, '--viz-vu');
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [active, analyser, isPlaying, output, preampDb]);

  return (
    <div className="sk-panel rounded-xl border border-cosmic-light-teal/30 bg-cosmic-teal/10 p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-cosmic-light-teal/70">
        <span>I/O Meter</span>
        <span className={`${isClipping ? 'text-red-300' : 'text-cosmic-light-teal/50'}`}>{isClipping ? 'Clip' : 'Safe'}</span>
      </div>
      <canvas ref={canvasRef} className="h-14 w-full rounded-lg border border-cosmic-light-teal/25 bg-cosmic-teal/15" />
      <div className="mt-2 flex justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-cosmic-light-teal/60">
        <span>Preamp {preampDb >= 0 ? '+' : ''}{preampDb.toFixed(1)} dB</span>
        <span>Output {Math.round(output * 100)}%</span>
      </div>
    </div>
  );
}
