export default function AuthButton({ children, loading, disabled, variant = 'primary', ...rest }) {
  return (
    <button
      className={`auth-button auth-button--${variant}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Memproses…' : children}
    </button>
  );
}
