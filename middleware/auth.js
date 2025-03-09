const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Log request information for debugging
    console.log(`Token verification request for path: ${req.path}`);
    console.log(`Authorization header present: ${!!req.headers.authorization}`);
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Store user data in request object
    req.user = {
      id: decoded.id,
      telegram_id: decoded.telegram_id
    };
    
    console.log(`Token verified successfully for user ID: ${req.user.id}`);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { verifyToken };
