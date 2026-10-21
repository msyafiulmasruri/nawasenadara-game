import app from '../src/server/index.js';

export default function handler(req, res) {
  if (req.url === '/api' || req.url === '/api/' || !req.url) {
    req.url = '/';
  }
  return app(req, res);
}
