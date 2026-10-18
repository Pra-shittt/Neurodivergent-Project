// Reusable 1-5 slider with emoji label and colour coding
export default function MetricSlider({ label, icon, value, onChange, colorVar = '--accent-purple' }) {
  const labels = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High']
  const emojis = ['', '😔', '🙁', '😐', '🙂', '😊']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1rem' }}>{emojis[value]}</span>
          <span style={{ fontSize: '0.8rem', color: `var(${colorVar})`, fontWeight: 600 }}>{labels[value]}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 16 }}>{value}/5</span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            appearance: 'none',
            height: 6,
            borderRadius: 99,
            background: `linear-gradient(to right, var(${colorVar}) ${(value - 1) * 25}%, var(--border) ${(value - 1) * 25}%)`,
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(${colorVar});
          cursor: pointer;
          box-shadow: 0 0 6px rgba(124,106,247,0.4);
          transition: transform 0.15s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  )
}
