const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer.js'); 

router.get('/:userId',protect, userController.getUserProfile);

router.put('/:userId', protect, upload.single('profileImageUrl'), userController.updateUserProfile);

router.get('/:userId/posts', protect, userController.getUserPosts);

router.post('/:userId/follow', protect, userController.followUser);

router.post('/:userId/unfollow', protect, userController.unfollowUser);



module.exports = router;