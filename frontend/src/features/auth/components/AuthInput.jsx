export default function AuthInput({ label, id, error, hint, ...inputProps }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-field__label">
        {label}
      </label>
      <input
        id={id}
        className="auth-field__input"
        {...inputProps}
        onFocus={(e) => {
          inputProps.onFocus?.(e);
          setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 240);
        }}
      />
      {hint && !error ? <p className="auth-field__hint">{hint}</p> : null}
      {error ? (
        <p className="auth-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
