import app from '../src/server/index.js';

export default function handler(req, res) {
  req.url = '/health';
  return app(req, res);
}
