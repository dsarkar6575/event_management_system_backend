const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');


router.get('/', protect, chatController.getUserChats);


router.post('/join/:postId', protect, chatController.joinPostGroupChat);


router.get('/post/:postId', protect, chatController.getChatByPostId);


router.get('/:chatId/messages', protect, chatController.getGroupMessages);


module.exports = router;