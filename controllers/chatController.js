const Chat = require('../models/Chat');
const Post = require('../models/Post');
const Message = require('../models/Message');


exports.joinPostGroupChat = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }
        if (!post.isEvent) {
            return res.status(400).json({ msg: 'This post does not have a group chat.' });
        }
        
        let chat = await Chat.findOne({ postId });

        if (chat) {
            if (!chat.participants.map(p => p.toString()).includes(userId)) {
                chat.participants.push(userId);
                await chat.save();
            }
        } else {
            chat = await Chat.create({
                postId,
                groupName: post.title,
                participants: [post.author, userId],
                isGroupChat: true,
            });
        }

        const io = req.io;
        io.in(userId).socketsJoin(chat._id.toString());
        
        await chat.populate('participants', 'username profileImageUrl');

        res.status(200).json({ msg: 'Successfully joined chat', chat });

    } catch (err) {
        console.error('❌ Error in joinPostGroupChat:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};


exports.getUserChats = async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user.id })
            .populate('participants', 'username profileImageUrl')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'username profileImageUrl' },
            })
            .sort({ updatedAt: -1 });

        res.status(200).json(chats);
    } catch (err) {
        console.error('❌ Error fetching user chats:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};


exports.getGroupMessages = async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        if (!chat.participants.map(p => p.toString()).includes(userId)) {
            return res.status(403).json({ msg: 'You are not a participant in this chat' });
        }

        const messages = await Message.find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .populate('sender', 'username profileImageUrl');

        res.status(200).json(messages);
    } catch (err) {
        console.error('❌ Error fetching messages:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};


exports.getChatByPostId = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        const chat = await Chat.findOne({ postId })
            .populate('participants', 'username profileImageUrl');

        if (!chat) {
            return res.status(404).json({ msg: 'No group chat found for this post' });
        }
        if (!chat.participants.map(p => p.toString()).includes(userId)) {
            return res.status(403).json({ msg: 'You do not have access to this chat.' });
        }

        res.status(200).json(chat);
    } catch (err) {
        console.error('❌ Error in getChatByPostId:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};


exports.sendGroupMessage = async (req, res) => {
    res.status(400).json({ msg: "This endpoint is deprecated. Use Socket.IO 'sendMessage' event." });
};