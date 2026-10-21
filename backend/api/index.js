import app from '../src/server/index.js';

export default function handler(req, res) {
  const matchedPath =
    req.headers['x-matched-path'] || req.headers['x-forwarded-url'];
  if (matchedPath && matchedPath !== '/api' && req.url === '/api') {
    req.url = matchedPath;
  }
  return app(req, res);
}
