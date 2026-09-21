export default function AuthMessage({ type = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`auth-message auth-message--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
