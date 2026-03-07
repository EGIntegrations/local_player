import { useRef, useEffect } from 'react';

interface WaveformProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export function Waveform({ analyser, isPlaying }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Background grid lines (retro feel)
      ctx.strokeStyle = 'rgba(143, 253, 192, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Waveform
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#8ffdc0');
      gradient.addColorStop(0.5, '#ffd88f');
      gradient.addColorStop(1, '#8ffdc0');

      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
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
      ctx.stroke();

      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffd88f';
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    if (isPlaying) {
      draw();
    } else {
      // Draw flat line when paused
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(143, 253, 192, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="w-full">
      <div className="mb-1 font-mono text-xs uppercase tracking-wider text-cosmic-light-teal/60">Waveform</div>
      <canvas
        ref={canvasRef}
        width={500}
        height={80}
        className="h-20 w-full rounded-lg border border-cosmic-light-teal/25 bg-cosmic-teal/80"
      />
    </div>
  );
}
