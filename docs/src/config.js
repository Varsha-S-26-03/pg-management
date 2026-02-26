const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
const UPI_ID = import.meta.env.VITE_PG_UPI_ID || '';
export default { API_URL, UPI_ID };
