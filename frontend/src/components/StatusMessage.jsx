const COLORS = { error: '#b00020', success: '#1b5e20', info: '#555' };

export default function StatusMessage({ type = 'info', children }) {
  if (!children) {
    return null;
  }

  return (
    <p
      role={type === 'error' ? 'alert' : 'status'}
      style={{ color: COLORS[type], margin: '0.5rem 0' }}
    >
      {children}
    </p>
  );
}
