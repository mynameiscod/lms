const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev server only (npm start). Where /api, /uploads and the live-update socket go.
// Default: your local backend on :5000. To run the local UI against another backend (e.g. the live
// server), set REACT_APP_API_PROXY_TARGET in client/.env.development.local and restart npm start.
const target = process.env.REACT_APP_API_PROXY_TARGET || 'http://localhost:5000';

module.exports = function(app) {
  // Proxy API requests
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );

  // Proxy uploads (profile photos, resumes, etc.)
  app.use(
    '/uploads',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );

  // Live updates (notifications, chat) — the socket connects to the page's own origin.
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    })
  );
};
