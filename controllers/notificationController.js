const Notification = require('../models/Notification');
const User = require('../models/User');

exports.createNotification = async ({ recipientId, senderId, type, message, relatedEntityId }) => {
    try {
        const newNotification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type,
            message,
            relatedEntityId,
        });

        const savedNotification = await newNotification.save();


        return savedNotification;
    } catch (error) {
        console.error('❌ Error creating notification:', error.message);
        return null;
    }
};


exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 }) 
            .populate('sender', 'username profileImageUrl'); 

        res.status(200).json(notifications.map(n => n.toObject({ getters: true })));
    } catch (err) {
        console.error('❌ Error fetching notifications:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found.' });
        }

        if (notification.recipient.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized: Not your notification.' });
        }

        notification.isRead = true;
        await notification.save();

        res.json({ msg: 'Notification marked as read.', notification: notification.toObject({ getters: true }) });
    } catch (err) {
        console.error('❌ Error marking as read:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid Notification ID' });
        }
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found.' });
        }

        if (notification.recipient.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized: Not your notification.' });
        }

        await Notification.deleteOne({ _id: notificationId });
        res.json({ msg: 'Notification deleted.' });
    } catch (err) {
        console.error('❌ Error deleting notification:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid Notification ID' });
        }
        res.status(500).json({ msg: 'Server Error' });
    }
};
