// Devuelve la base del backend SIN /api (p.ej. http://localhost:5001)
export const backendBase = (() => {
  const raw = import.meta.env.VITE_API_URL || 'http://190.220.57.172:5010/api';
  return raw.replace(/\/api\/?$/, '');
})();
