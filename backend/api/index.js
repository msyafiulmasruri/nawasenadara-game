import app from '../src/server/index.js';

export default function handler(req, res) {
  const matchedPath =
    req.headers['x-matched-path'] || req.headers['x-forwarded-url'];
  if (
    matchedPath &&
    typeof matchedPath === 'string' &&
    matchedPath.startsWith('/')
  ) {
    req.url = matchedPath;
  }
  return app(req, res);
}
