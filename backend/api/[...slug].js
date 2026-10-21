import app from '../src/server/index.js';

export default function handler(req, res) {
  if (req.query?.slug) {
    const slug = Array.isArray(req.query.slug)
      ? req.query.slug.join('/')
      : req.query.slug;
    req.url = '/api/' + slug;
  }
  return app(req, res);
}
