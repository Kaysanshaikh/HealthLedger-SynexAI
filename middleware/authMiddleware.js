const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  let token = null;

  if (header) {
    token = header.replace(/^Bearer\s+/i, "");
  } else if (req.query.token) {
    // 🔗 Allow token in query string for direct browser navigation (e.g. window.open)
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authorization header or token required" });
  }

  try {
    // 1. Try to verify as a dynamic JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hl_fallback_secret');
    req.user = decoded;
    return next();
  } catch (err) {
    // 2. Fallback: Check for legacy static token (for admin or during migration)
    if (process.env.JWT && token === process.env.JWT) {
      req.user = { role: 'admin', token }; // Treat as admin if static token matches
      return next();
    }

    console.error("❌ Auth Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
