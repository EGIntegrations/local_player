import { useRef, useEffect, useState } from 'react';

interface VUMetersProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

function MeterRow({ label, level, peak }: { label: 'L' | 'R'; level: number; peak: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(level * 100)));
  const peakPercent = Math.max(0, Math.min(100, Math.round(peak * 100)));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-cosmic-light-teal/65">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="relative h-6 rounded border border-cosmic-light-teal/35 bg-cosmic-teal/15 px-1 py-1">
        <div className="absolute inset-1 flex gap-0.5 opacity-25">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-full w-full rounded-[1px] bg-cosmic-light-teal/45" />
          ))}
        </div>

        <div
          className="absolute inset-y-1 left-1 rounded bg-gradient-to-r from-cosmic-teal via-cosmic-apricot to-cosmic-orange transition-[width] duration-75"
          style={{ width: `calc(${percent}% - 0.5rem)` }}
        />

        <div
          className="absolute inset-y-1 w-0.5 rounded bg-cosmic-orange/95 transition-[left] duration-150"
          style={{ left: `calc(${peakPercent}% - 0.125rem)` }}
        />
      </div>
    </div>
  );
}

export function VUMeters({ analyser, isPlaying }: VUMetersProps) {
  const [leftLevel, setLeftLevel] = useState(0);
  const [rightLevel, setRightLevel] = useState(0);
  const [leftPeak, setLeftPeak] = useState(0);
  const [rightPeak, setRightPeak] = useState(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !isPlaying) {
      setLeftLevel((prev) => prev * 0.86);
      setRightLevel((prev) => prev * 0.86);
      setLeftPeak((prev) => prev * 0.96);
      setRightPeak((prev) => prev * 0.96);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      animFrameRef.current = requestAnimationFrame(update);
      analyser.getByteFrequencyData(dataArray);

      const mid = Math.floor(bufferLength / 2);
      let leftSum = 0;
      let rightSum = 0;

      for (let i = 0; i < mid; i++) leftSum += dataArray[i];
      for (let i = mid; i < bufferLength; i++) rightSum += dataArray[i];

      const rawLeft = Math.min(1, (leftSum / (mid * 255)) * 2.4);
      const rawRight = Math.min(1, (rightSum / ((bufferLength - mid) * 255)) * 2.4);

      setLeftLevel((prev) => (rawLeft > prev ? prev + (rawLeft - prev) * 0.4 : prev + (rawLeft - prev) * 0.1));
      setRightLevel((prev) => (rawRight > prev ? prev + (rawRight - prev) * 0.4 : prev + (rawRight - prev) * 0.1));

      setLeftPeak((prev) => Math.max(rawLeft, prev * 0.985));
      setRightPeak((prev) => Math.max(rawRight, prev * 0.985));
    };

    update();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="sk-panel w-full rounded-xl border border-cosmic-light-teal/30 bg-cosmic-teal/10 p-3">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-cosmic-light-teal/70">
        Stereo VU
      </div>
      <div className="space-y-3">
        <MeterRow label="L" level={leftLevel} peak={leftPeak} />
        <MeterRow label="R" level={rightLevel} peak={rightPeak} />
      </div>
    </div>
  );
}
