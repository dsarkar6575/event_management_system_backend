const express = require('express');
const router = express.Router();
const  postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer.js'); 


router.post('/', protect, upload.array('mediaUrls', 5),postController.createPost);

router.get('/', protect, postController.getAllPosts);

router.get('/feed', protect, postController.getFeedPosts);

router.get('/:postId', protect, postController.getPostById);

router.put('/:postId', protect, upload.array('mediaUrls', 5), postController.updatePost);

router.delete('/:postId', protect, postController.deletePost);

router.put('/:postId/interest', protect, postController.togglePostInterest);

router.get('/my/interested', protect, postController.getInterestedPosts); 

router.post('/:postId/attend', protect, postController.markAttendance);

router.get('/my/attended', protect, postController.getAttendedPosts);

router.put('/:postId/attendance', protect, postController.togglePostAttendance);

router.post('/:postId/join-interest-group', protect, postController.joinInterestGroup);

module.exports = router;