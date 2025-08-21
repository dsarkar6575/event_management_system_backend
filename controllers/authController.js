const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/email');
const crypto = require('crypto'); 

const generateToken = (userId) => {
  return jwt.sign(
    { user: { id: userId } },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
};


exports.registerUser = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ msg: 'Please provide an email' });
    }

    try {
        let user = await User.findOne({ email });

        if (user && user.isVerified) {
            return res.status(400).json({ msg: 'User with this email already exists' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        if (user) {
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            user = new User({
                email,
                otp,
                otpExpires,
                userType: 'personal' 
            });
            await user.save();
        }

        const message = `
            <h2>Email Verification</h2>
            <p>Your OTP for registration is: <strong>${otp}</strong></p>
            <p>This code is valid for 10 minutes.</p>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Your Registration OTP',
            message: message,
        });

        res.status(200).json({ msg: 'OTP sent to your email. Please verify to complete registration.' });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ msg: 'Server error during registration' });
    }
};


exports.verifyOtpAndRegister = async (req, res) => {
    const { email, otp, username, password, userType } = req.body;

    if (!email || !otp || !username || !password || !userType) {
        return res.status(400).json({ msg: 'Please provide email, OTP, username, password, and user type' });
    }

    if (!['personal', 'corporate'].includes(userType)) {
        return res.status(400).json({ msg: 'Invalid user type. Must be personal or corporate.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user || user.isVerified) {
            return res.status(400).json({ msg: 'Invalid email or user already verified.' });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();
            return res.status(400).json({ msg: 'Invalid or expired OTP.' });
        }

        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({ msg: 'Username already taken.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.username = username;
        user.password = hashedPassword;
        user.userType = userType; 
        user.isVerified = true;
        user.otp = undefined; 
        user.otpExpires = undefined;
        await user.save();

        const token = generateToken(user.id);
        res.status(201).json({ token, user });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ msg: 'Server error during verification' });
    }
};


exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please provide email and password' });
    }
    
    try {
        const user = await User.findOne({ email });
    
        if (!user) {
            return res.status(404).json({ msg: 'Invalid credentials' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ msg: 'Please verify your email address first.' });
        }
    
        if (!user.password) {
            return res.status(500).json({ msg: 'User password not found in DB. Possible schema/config issue.' });
        }
    
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        const token = generateToken(user.id);
        res.json({ token, user });
    
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ msg: 'Server error during login' });
    }
};


exports.getAuthUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Fetch auth user error:', err);
    res.status(500).send('Server Error');
  }
};
