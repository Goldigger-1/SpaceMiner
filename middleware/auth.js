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
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // Log request information for debugging
    console.log(`Token verification request for path: ${req.originalUrl}`);
    console.log(`Authorization header present: ${!!authHeader}`);
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ 
        error: 'No token provided', 
        message: 'Authentication token is missing. Please login again.'
      });
    }
    
    // Check if JWT_SECRET is properly set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Server authentication is misconfigured. Please contact support.'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store user data in request object
      req.user = {
        id: decoded.id,
        telegram_id: decoded.telegram_id
      };
      
      console.log(`Token verified successfully for user ID: ${req.user.id}`);
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'token_expired', 
          message: 'Your session has expired. Please login again.' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'invalid_token', 
          message: 'Invalid authentication token. Please login again.' 
        });
      }
      
      return res.status(401).json({ 
        error: 'authentication_failed',
        message: 'Authentication failed. Please login again.'
      });
    }
  } catch (error) {
    console.error('Unexpected error in auth middleware:', error);
    res.status(500).json({ 
      error: 'server_error', 
      message: 'An unexpected error occurred during authentication.'
    });
  }
};

module.exports = { verifyToken };
