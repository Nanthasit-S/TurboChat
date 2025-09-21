const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });
        const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) return res.status(409).json({ message: 'Username already exists' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        
        // Updated to include show_online_status
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                avatar_url: user.avatar_url,
                show_online_status: user.show_online_status
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/check-session', authenticateToken, async (req, res) => {
    try {
        // Updated to include show_online_status
        const [users] = await db.query('SELECT avatar_url, show_online_status FROM users WHERE id = ?', [req.user.id]);
        
        res.json({
            user: {
                id: req.user.id,
                username: req.user.username,
                avatar_url: users.length > 0 ? users[0].avatar_url : null,
                show_online_status: users.length > 0 ? !!users[0].show_online_status : true
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/settings', authenticateToken, async (req, res) => {
     try {
        const { newUsername } = req.body;
        const currentUserId = req.user.id;
        if (!newUsername) return res.status(400).json({ message: 'New username is required.' });
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, currentUserId]);
        if (existingUser.length > 0) return res.status(409).json({ message: 'Username is already taken.' });
        await db.query('UPDATE users SET username = ? WHERE id = ?', [newUsername, currentUserId]);
        const updatedUser = { id: currentUserId, username: newUsername };
        const newToken = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Settings updated successfully.', user: updatedUser, token: newToken });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
        const avatarUrl = `/uploads/${req.file.filename}`;
        await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);
        res.json({ message: 'Avatar updated successfully', avatar_url: avatarUrl });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;