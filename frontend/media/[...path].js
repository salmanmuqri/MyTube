function getBackendBase() {
  const raw = process.env.RAILWAY_BACKEND_URL || process.env.BACKEND_URL || '';
  return raw.replace(/\/+$/, '').replace(/\/api$/, '').replace(/\/media$/, '');
}

export default async function handler(req, res) {
  const backendBase = getBackendBase();
  if (!backendBase) {
    return res.status(500).json({
      error: 'Missing RAILWAY_BACKEND_URL environment variable on Vercel',
    });
  }

  const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  const query = new URLSearchParams(req.query || {});
  query.delete('path');
  const search = query.toString();
  const target = `${backendBase}/media/${pathParts.join('/')}${search ? `?${search}` : ''}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      redirect: 'manual',
    });

    const body = await upstream.arrayBuffer();
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    return res.send(Buffer.from(body));
  } catch (error) {
    return res.status(502).json({
      error: 'Upstream media is unreachable',
      detail: error?.message || 'Unknown proxy error',
      target,
    });
  }
}
