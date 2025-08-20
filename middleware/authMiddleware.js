const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  try {
    let token;
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = req.header('x-auth-token');
    }

    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Decoded token:', decoded);

    const userId = decoded.user?.id || decoded._id || decoded.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Invalid token payload' });
    }

    req.user = { id: userId }; 

    next();
  } catch (err) {
    console.error('❌ JWT verification error:', err.message);
    return res.status(401).json({ msg: 'Token is not valid or expired' });
  }
};