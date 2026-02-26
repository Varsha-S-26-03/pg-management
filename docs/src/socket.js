import io from 'socket.io-client';
import config from './config';
const { API_URL } = config;

let socket = null;

export const connectSocket = (userId) => {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(API_URL, {
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('🔌 Connected to server');
    if (userId) {
      socket.emit('join', userId);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
  });
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  return socket;
};

export const onFeedbackNotification = (callback) => {
  if (socket) {
    socket.on('new-feedback', callback);
  }
};

export const onFeedbackReply = (callback) => {
  if (socket) {
    socket.on('feedback-replied', callback);
  }
};

export const offFeedbackNotification = () => {
  if (socket) {
    socket.off('new-feedback');
  }
};

export const offFeedbackReply = () => {
  if (socket) {
    socket.off('feedback-replied');
  }
};

export const onNoticeNotification = (callback) => {
  if (socket) {
    socket.on('new-notice', callback);
  }
};

export const onNoticeUpdate = (callback) => {
  if (socket) {
    socket.on('notice-updated', callback);
  }
};

export const onNoticeDelete = (callback) => {
  if (socket) {
    socket.on('notice-deleted', callback);
  }
};

export const offNoticeNotifications = () => {
  if (socket) {
    socket.off('new-notice');
    socket.off('notice-updated');
    socket.off('notice-deleted');
  }
};