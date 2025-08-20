const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); 


router.post('/register', authController.registerUser);

router.post('/verify', authController.verifyOtpAndRegister);

router.post('/login', authController.loginUser);

router.get('/', protect, authController.getAuthUser);

module.exports = router;