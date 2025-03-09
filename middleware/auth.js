const jwt = require('jsonwebtoken');

/**
 * Verify JWT token middleware
 */
const verifyToken = (req, res, next) => {
  console.log('Authentication attempt:', {
    tokenProvided: !!req.headers.authorization,
    telegramDataProvided: !!req.headers['telegram-data']
  });
  
  // Get token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.error('No token provided in request');
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Verify the token
    console.log('Verifying token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user data to request
    req.user = { id: decoded.id, telegram_id: decoded.telegram_id };
    console.log('Token verified successfully for user ID:', decoded.id);
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  verifyToken
};
