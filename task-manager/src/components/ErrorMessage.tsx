interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}

function ErrorMessage({ message, onRetry, onClose }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <span className="error-message__text">{message}</span>
      <div className="error-message__actions">
        {onRetry && (
          <button type="button" className="btn btn--primary btn--small" onClick={onRetry}>
            Try again
          </button>
        )}
        {onClose && (
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorMessage;
