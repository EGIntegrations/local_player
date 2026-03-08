import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const variants = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
};

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`toast-shell fixed bottom-4 right-4 z-50 px-6 py-3 font-mono text-sm ${variants[type]}`}
    >
      <p>{message}</p>
    </div>
  );
}
