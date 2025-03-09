const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
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
