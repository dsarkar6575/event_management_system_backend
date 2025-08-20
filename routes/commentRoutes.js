const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');


router.post('/:postId/comments', protect, commentController.createComment);
router.get('/:postId/comments', protect, commentController.getCommentsByPost);


module.exports = router;
