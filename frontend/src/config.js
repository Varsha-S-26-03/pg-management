const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
export default { API_URL };
