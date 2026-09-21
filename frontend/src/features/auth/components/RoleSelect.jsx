const ROLE_OPTIONS = [
  { value: 'siswa', label: 'Siswa', hint: 'Aku yang akan memainkan game-nya' },
  { value: 'guru_bk', label: 'Guru BK', hint: 'Memantau progres & notifikasi darurat siswa' },
  { value: 'orang_tua', label: 'Orang Tua', hint: 'Menerima ringkasan progres anak' },
];

export default function RoleSelect({ value, onChange }) {
  return (
    <div className="auth-field">
      <span className="auth-field__label">Kamu mendaftar sebagai</span>
      <div className="auth-role-grid" role="radiogroup" aria-label="Peran pengguna">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`auth-role-option${value === opt.value ? ' auth-role-option--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <span className="auth-role-option__label">{opt.label}</span>
            <span className="auth-role-option__hint">{opt.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
