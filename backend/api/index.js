import app from '../src/server/index.js';

export default function handler(req, res) {
  req.url = '/';
  return app(req, res);
}
