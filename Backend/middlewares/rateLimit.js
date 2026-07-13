const buckets = new Map();

export const createRateLimiter = ({ windowMs = 60_000, max = 60, keyPrefix = "global" } = {}) => (
  req,
  res,
  next
) => {
  const now = Date.now();
  const key = `${keyPrefix}:${req.ip}`;
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > max) {
    res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ message: "Too many requests. Please try again later." });
  }

  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();
