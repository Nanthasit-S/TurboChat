// src/routes/chat.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

// --- Multer Setup for Chat Image Uploads ---
const chatUploadsDir = path.join(__dirname, '../../uploads/chat_images');
if (!fs.existsSync(chatUploadsDir)) {
    fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, chatUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
}).single('chatImage');

/**
 * @route   POST /api/chat/upload-image
 * @desc    Upload an image for chat
 * @access  Private
 */
router.post('/upload-image', authenticateToken, (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error: ${err.message}. Ensure file is an image and under 2MB.` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file was uploaded.' });
        }

        const fileUrl = `/uploads/chat_images/${req.file.filename}`;
        res.status(200).json({ message: 'File uploaded successfully', url: fileUrl });
    });
});


/**
 * @route   GET /api/chat/history/:peerUsername
 * @desc    Get private chat history with another user
 * @access  Private
 */
router.get('/history/:peerUsername', authenticateToken, async (req, res) => {
    try {
        const { peerUsername } = req.params;
        const currentUserId = req.user.id;

        const [peerUsers] = await db.query('SELECT id FROM users WHERE username = ?', [peerUsername]);
        if (peerUsers.length === 0) {
            return res.status(404).json({ message: `User '${peerUsername}' not found.` });
        }
        const peerUserId = peerUsers[0].id;

        const [messages] = await db.query(
            `SELECT
                pm.id,
                pm.message_text AS text,
                pm.timestamp,
                pm.is_read,
                pm.message_type AS type,
                u_sender.username AS sender,
                u_sender.avatar_url as senderAvatar
             FROM private_messages pm
             JOIN users u_sender ON pm.sender_id = u_sender.id
             WHERE (pm.sender_id = ? AND pm.receiver_id = ?)
                OR (pm.sender_id = ? AND pm.receiver_id = ?)
             ORDER BY pm.timestamp ASC`,
            [currentUserId, peerUserId, peerUserId, currentUserId]
        );
        
        res.json(messages);
    } catch (error) {
        console.error("Get chat history error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;