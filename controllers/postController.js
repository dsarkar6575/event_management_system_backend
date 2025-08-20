const Post = require('../models/Post');
const User = require('../models/User');
const Chat = require('../models/Chat');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');


exports.createPost = async (req, res) => {
    const { title, description, isEvent, eventDateTime, location } = req.body;

    if (!title || !description) {
        return res.status(400).json({ msg: 'Ti  tle and description are required.' });
    }

    try {
        let imageUrls = [];

        if (req.files && Array.isArray(req.files)) {
            const imageUploadPromises = req.files.map(async (file) => {
                const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                const result = await cloudinary.uploader.upload(base64, {
                    folder: 'event_social_posts',
                });
                return result.secure_url;
            });

            imageUrls = await Promise.all(imageUploadPromises);
        }

        const newPost = new Post({
            author: req.user.id,
            title,
            description,
            mediaUrls: imageUrls,
            isEvent: isEvent === 'true' || isEvent === true,
            eventDateTime: isEvent ? eventDateTime : null,
            location: isEvent ? location : null,
        });

        const post = await newPost.save();
        await post.populate('author', 'username profileImageUrl');

        res.status(201).json({ post: post.toObject({ getters: true }) });

    } catch (err) {
        console.error('❌ Error creating post:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
};



exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username profileImageUrl');

        res.status(200).json(posts.map(p => p.toObject({ getters: true })));
    } catch (err) {
        console.error('❌ Error fetching posts:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
            .populate('author', 'username profileImageUrl');

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        res.status(200).json(post.toObject({ getters: true }));
    } catch (err) {
        console.error('❌ Error fetching post:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid Post ID' });
        }
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.updatePost = async (req, res) => {
    const { title, description, isEvent, eventDateTime, location, clearExistingMedia } = req.body; // Destructure clearExistingMedia

    try {
        let post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized: You are not the author.' });
        }

        if (clearExistingMedia === 'true') { 
            post.mediaUrls = [];
        }

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const imageUploadPromises = req.files.map(async (file) => {
                const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                const result = await cloudinary.uploader.upload(base64, {
                    folder: 'event_social_posts',
                });
                return result.secure_url;
            });

            post.mediaUrls = await Promise.all(imageUploadPromises);
        }

        if (title !== undefined) post.title = title;
        if (description !== undefined) post.description = description;
        if (isEvent !== undefined) post.isEvent = isEvent;
        if (eventDateTime !== undefined) post.eventDateTime = eventDateTime;
        if (location !== undefined) post.location = location;

        await post.save();
        await post.populate('author', 'username profileImageUrl');

        res.status(200).json({ post: post.toObject({ getters: true }) });
    } catch (err) {
        console.error('❌ Error updating post:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized: You are not the author.' });
        }

        await Post.deleteOne({ _id: req.params.postId });
        res.status(200).json({ msg: 'Post deleted successfully.' });
    } catch (err) {
        console.error('❌ Error deleting post:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid Post ID' });
        }
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.togglePostInterest = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        if (post.eventDateTime && new Date() >= post.eventDateTime) {
            return res.status(400).json({ msg: 'Cannot mark interest after event starts.' });
        }

        const userId = req.user.id;
        const isInterested = post.interestedUsers.includes(userId);

        if (isInterested) {
            post.interestedUsers = post.interestedUsers.filter(id => id.toString() !== userId);
            post.interestedCount = Math.max(post.interestedCount - 1, 0);
        } else {
            post.interestedUsers.push(userId);
            post.interestedCount += 1;
        }
        


        await post.save();
        await post.populate('author', 'username profileImageUrl');

        res.status(200).json({
            msg: isInterested ? 'Interest removed' : 'Interest added',
            interested: !isInterested,
            post: post.toObject({ getters: true })
        });
    } catch (err) {
        console.error('❌ Error toggling interest:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.getInterestedPosts = async (req, res) => {
    try {
        const posts = await Post.find({ interestedUsers: req.user.id })
            .sort({ eventDateTime: 1, createdAt: -1 })
            .populate('author', 'username profileImageUrl');

        res.status(200).json(posts.map(p => p.toObject({ getters: true })));
    } catch (err) {
        console.error('❌ Error fetching interested posts:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.markAttendance = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const userId = req.user.id;

    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const now = new Date();
    if (!post.isEvent || now < post.eventDateTime) {
      return res.status(400).json({ msg: 'Cannot mark attendance before event starts' });
    }

    if (!post.interestedUsers.includes(userId)) {
      return res.status(403).json({ msg: 'You must be interested before the event to mark attendance.' });
    }

    if (post.attendedUsers.includes(userId)) {
      return res.status(400).json({ msg: 'Already marked as attended' });
    }

    post.attendedUsers.push(userId);
    await post.save();

    const updatedPost = await Post.findById(post._id).populate('author');

    res.status(200).json({
      msg: 'Attendance marked successfully',
      attended: true,
      post: updatedPost, 
    });
  } catch (err) {
    console.error('❌ Error marking attendance:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

exports.togglePostAttendance = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id; 

    try {
        let post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const isAttended = post.attendedUsers.includes(userId);

        if (isAttended) {
            post.attendedUsers = post.attendedUsers.filter(id => id.toString() !== userId.toString());
        } else {
            post.attendedUsers.push(userId);
        }

        await post.save();

        const updatedPost = await Post.findById(postId).populate('author', 'username profileImageUrl');

        res.status(200).json({ post: updatedPost });

    } catch (error) {
        console.error('Error toggling post attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


exports.getAttendedPosts = async (req, res) => {
    try {
        const userId = req.user.id;

        const attendedPosts = await Post.find({
            isEvent: true, 
            attendedUsers: userId,
            eventDateTime: { $lt: new Date() } 
        })
            .populate('author', 'username profileImageUrl') 
            .sort({ eventDateTime: -1 }); 

        res.status(200).json(attendedPosts.map(p => p.toObject({ getters: true })));
    } catch (err) {
        console.error('❌ Error fetching attended posts:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};


exports.joinInterestGroup = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ msg: 'Invalid post ID format.' });
    }


    const [post, chat] = await Promise.all([
      Post.findById(postId),
      Chat.findOne({ postId })
    ]);
    
    if (!post || !post.isEvent) {
      return res.status(404).json({ msg: 'Event post not found or is not an event.' });
    }

    let updatedChat;

    if (chat) {
      if (!chat.participants.map(p => p.toString()).includes(userId.toString())) {
        chat.participants.push(userId);
        updatedChat = await chat.save();
      } else {
        updatedChat = chat;
      }
    } else {
      updatedChat = await Chat.create({
        postId,
        groupName: post.title,
        participants: [userId],
        isGroupChat: true,
      });
    }

    if (!post.interestedUsers.map(u => u.toString()).includes(userId.toString())) {
        post.interestedUsers.push(userId);
        await post.save();
    }

    await updatedChat.populate('participants', 'username profileImageUrl');

    res.status(200).json({ msg: 'Joined interest group', chat: updatedChat });
  } catch (err) {
    console.error('❌ joinInterestGroup error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};


exports.getFeedPosts = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    let query = {};

    if (currentUser.following && currentUser.following.length > 0) {
      query = { author: { $in: currentUser.following } };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "username profileImageUrl");

    res.status(200).json(posts.map((p) => p.toObject({ getters: true })));
  } catch (err) {
    console.error("❌ Error fetching feed posts:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
};