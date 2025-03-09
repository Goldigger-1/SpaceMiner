const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Get Telegram data if available
  const telegramData = req.headers['telegram-data'] || '';
  
  // Log authentication attempt
  console.log(`Authentication attempt: Token ${token ? 'provided' : 'missing'}, Telegram data ${telegramData ? 'provided' : 'missing'}`);
  
  // If no token but Telegram data is available, try to authenticate with Telegram
  if (!token && telegramData) {
    console.log('No token but Telegram data available, redirecting to Telegram authentication');
    return res.status(401).json({ 
      error: 'No token provided, but Telegram data found', 
      code: 'TELEGRAM_AUTH_REQUIRED' 
    });
  }
  
  if (!token) {
    console.error('No token provided in request headers');
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    console.log(`Verifying token: ${token.substring(0, 20)}...`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`Token verified successfully for user ID: ${decoded.id}`);
    
    req.userId = decoded.id;
    req.telegram_id = decoded.telegram_id;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
    
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  verifyToken
};
