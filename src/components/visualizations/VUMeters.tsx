import { useRef, useEffect, useState } from 'react';

interface VUMetersProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

function MeterNeedle({ level }: { level: number }) {
  // level is 0-1, map to angle: -45deg (silent) to +45deg (max)
  const angle = -45 + level * 90;

  return (
    <div className="relative w-32 h-20 overflow-hidden">
      {/* Meter background */}
      <div className="absolute inset-0 bg-gray-900/80 rounded-t-full border border-cosmic-teal/40">
        {/* Scale markings */}
        <svg viewBox="0 0 128 64" className="w-full h-full">
          {/* Arc scale */}
          <path
            d="M 16 60 A 48 48 0 0 1 112 60"
            fill="none"
            stroke="rgba(222, 247, 249, 0.2)"
            strokeWidth="1"
          />
          {/* Green zone (0 to -6dB) */}
          <path
            d="M 16 60 A 48 48 0 0 1 64 12"
            fill="none"
            stroke="rgba(34, 197, 94, 0.3)"
            strokeWidth="3"
          />
          {/* Yellow zone (-6 to 0dB) */}
          <path
            d="M 64 12 A 48 48 0 0 1 96 28"
            fill="none"
            stroke="rgba(234, 179, 8, 0.3)"
            strokeWidth="3"
          />
          {/* Red zone (0 to +3dB) */}
          <path
            d="M 96 28 A 48 48 0 0 1 112 60"
            fill="none"
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="3"
          />
          {/* Scale labels */}
          <text x="16" y="58" fill="rgba(222, 247, 249, 0.5)" fontSize="6" fontFamily="monospace">-20</text>
          <text x="38" y="28" fill="rgba(222, 247, 249, 0.5)" fontSize="6" fontFamily="monospace">-10</text>
          <text x="68" y="16" fill="rgba(222, 247, 249, 0.5)" fontSize="6" fontFamily="monospace">-3</text>
          <text x="92" y="28" fill="rgba(234, 179, 8, 0.5)" fontSize="6" fontFamily="monospace">0</text>
          <text x="106" y="48" fill="rgba(239, 68, 68, 0.5)" fontSize="6" fontFamily="monospace">+3</text>

          {/* Needle */}
          <line
            x1="64"
            y1="62"
            x2={64 + 44 * Math.sin((angle * Math.PI) / 180)}
            y2={62 - 44 * Math.cos((angle * Math.PI) / 180)}
            stroke="#F4A261"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Needle pivot */}
          <circle cx="64" cy="62" r="3" fill="#A84B2F" />
        </svg>
      </div>
    </div>
  );
}

export function VUMeters({ analyser, isPlaying }: VUMetersProps) {
  const [leftLevel, setLeftLevel] = useState(0);
  const [rightLevel, setRightLevel] = useState(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !isPlaying) {
      // Decay to zero when not playing
      setLeftLevel((prev) => prev * 0.9);
      setRightLevel((prev) => prev * 0.9);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      animFrameRef.current = requestAnimationFrame(update);
      analyser.getByteFrequencyData(dataArray);

      // Split into left/right channels (approximate with low/high freq)
      const mid = Math.floor(bufferLength / 2);
      let leftSum = 0;
      let rightSum = 0;

      for (let i = 0; i < mid; i++) {
        leftSum += dataArray[i];
      }
      for (let i = mid; i < bufferLength; i++) {
        rightSum += dataArray[i];
      }

      // Normalize to 0-1 with some smoothing
      const rawLeft = leftSum / (mid * 255);
      const rawRight = rightSum / ((bufferLength - mid) * 255);

      // Apply VU meter ballistics (slow attack, slower release)
      setLeftLevel((prev) => {
        const target = rawLeft * 2.5; // boost for visibility
        return target > prev ? prev + (target - prev) * 0.3 : prev + (target - prev) * 0.08;
      });
      setRightLevel((prev) => {
        const target = rawRight * 2.5;
        return target > prev ? prev + (target - prev) * 0.3 : prev + (target - prev) * 0.08;
      });
    };

    update();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="w-full">
      <div className="text-xs text-gray-500 font-mono mb-1 uppercase tracking-wider">VU Meters</div>
      <div className="flex justify-center gap-4">
        <div className="text-center">
          <MeterNeedle level={Math.min(1, leftLevel)} />
          <div className="text-xs text-gray-500 font-mono mt-1">L</div>
        </div>
        <div className="text-center">
          <MeterNeedle level={Math.min(1, rightLevel)} />
          <div className="text-xs text-gray-500 font-mono mt-1">R</div>
        </div>
      </div>
    </div>
  );
}
