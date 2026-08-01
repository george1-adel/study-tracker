export interface ToastProps {
  message: string;
  onClose?: () => void;
  closeLabel?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function Toast({ message, onClose, closeLabel = 'Close', type = 'info' }: ToastProps) {
  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-message">{message}</span>
      {onClose && (
        <button type="button" className="toast-close" onClick={onClose} aria-label={closeLabel}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
