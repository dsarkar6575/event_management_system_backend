require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const commentRoutes = require('./routes/commentRoutes');


const Chat = require('./models/Chat');
const Message = require('./models/Message'); 

const app = express();
const server = http.createServer(app);


connectDB();


app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});


io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token provided.'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded.user; 
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token.'));
  }
});


io.on('connection', async (socket) => {
  console.log(`✅ Socket connected: ${socket.user.id}`);


  socket.join(socket.user.id);


  try {
    const userChats = await Chat.find({ participants: socket.user.id }).select('_id');
    userChats.forEach(chat => {
      socket.join(chat._id.toString());
    });
  } catch (err) {
    console.error('❌ Failed to join chat rooms:', err.message);
  }


  socket.on('sendMessage', async (data) => {
    try {
        const { chatRoomId, content, type = 'text', mediaUrl = null } = data;
        const senderId = socket.user.id;

        const chat = await Chat.findById(chatRoomId);
        if (!chat || !chat.participants.map(p => p.toString()).includes(senderId)) {
            return socket.emit('sendMessageError', { message: 'Chat not found or you are not a participant.' });
        }

        const newMessage = new Message({
            chat: chatRoomId,
            sender: senderId,
            content: content,
            type: type,
            mediaUrl: mediaUrl,
            readBy: [senderId]
        });
        
        let savedMessage = await newMessage.save();

        chat.lastMessage = savedMessage._id;
        await chat.save();
        
        savedMessage = await savedMessage.populate('sender', 'username profileImageUrl');

        io.to(chatRoomId).emit('receiveMessage', savedMessage);

    } catch (error) {
        console.error('❌ Socket message error:', error);
        socket.emit('sendMessageError', { message: 'Failed to send message.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`⚠️ Socket disconnected: ${socket.user.id}`);
  });
});


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/posts', commentRoutes);

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).send('Something broke!');
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));    