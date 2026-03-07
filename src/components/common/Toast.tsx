import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const bgColors = {
  success: 'border-cosmic-light-teal/45 bg-cosmic-teal/95 text-cosmic-light-teal',
  error: 'border-red-400/55 bg-red-950/90 text-red-100',
  info: 'border-cosmic-orange/50 bg-cosmic-teal/95 text-cosmic-apricot',
};

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg border px-6 py-3 font-mono text-sm shadow-lg ${bgColors[type]}`}
    >
      <p>{message}</p>
    </div>
  );
}
