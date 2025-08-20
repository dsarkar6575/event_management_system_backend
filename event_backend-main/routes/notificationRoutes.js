const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');


router.get('/', protect, notificationController.getNotifications);


router.put('/:notificationId/read', protect, notificationController.markNotificationAsRead);


router.delete('/:notificationId', protect, notificationController.deleteNotification);

module.exports = router;