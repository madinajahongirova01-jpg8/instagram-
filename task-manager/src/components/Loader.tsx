interface LoaderProps {
  label?: string;
  size?: 'small' | 'large';
}

function Loader({ label, size = 'large' }: LoaderProps) {
  return (
    <div className={`loader loader--${size}`} role="status">
      <span className="loader__spinner" aria-hidden="true" />
      {label && <span className="loader__label">{label}</span>}
    </div>
  );
}

export default Loader;
