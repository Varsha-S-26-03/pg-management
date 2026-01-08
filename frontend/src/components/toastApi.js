let toastId = 0;
const listeners = new Set();

export const showToast = (message, type = 'success', duration = 3000) => {
  const id = ++toastId;
  listeners.forEach(listener => listener({ id, message, type, duration }));
  return id;
};

export const subscribeToToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
