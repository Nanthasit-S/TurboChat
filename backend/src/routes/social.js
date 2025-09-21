// src/routes/social.js
const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

// --- USER SEARCH & PROFILE ---
router.get('/users/search', authenticateToken, async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query) return res.json([]);
        const [users] = await db.query(
            'SELECT id, username, avatar_url FROM users WHERE username LIKE ? AND id != ? LIMIT 10',
            [`%${query}%`, req.user.id]
        );
        res.json(users);
    } catch (error) {
        console.error("Search users error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/users/profile/:username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user.id;
        const [users] = await db.query('SELECT id, username, avatar_url FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const profileUser = users[0];
        const [posts] = await db.query('SELECT id, content, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC', [profileUser.id]);
        
        const userOneId = Math.min(currentUserId, profileUser.id);
        const userTwoId = Math.max(currentUserId, profileUser.id);
        
        // แก้ไขให้ดึง chat_theme มาด้วย
        const [friendship] = await db.query(
            `SELECT * FROM friendships WHERE user_one_id = ? AND user_two_id = ?`,
            [userOneId, userTwoId]
        );

        res.json({
            user: profileUser,
            posts: posts,
            friendship: friendship.length > 0 ? friendship[0] : null
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// --- FRIEND MANAGEMENT ---

// Get list of accepted friends
router.get('/friends', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [friends] = await db.query(
            `SELECT u.id, u.username, u.avatar_url FROM users u 
             JOIN friendships f ON (f.user_one_id = u.id OR f.user_two_id = u.id) 
             WHERE (f.user_one_id = ? OR f.user_two_id = ?) 
             AND f.status = 'accepted' AND u.id != ?`,
            [userId, userId, userId]
        );
        res.json(friends);
    } catch (error) {
        console.error("Get friends error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get incoming friend requests
router.get('/friends/requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [requests] = await db.query(
            `SELECT u.id, u.username, u.avatar_url FROM users u 
             JOIN friendships f ON (f.user_one_id = u.id OR f.user_two_id = u.id)
             WHERE ((f.user_one_id = ? OR f.user_two_id = ?) AND f.status = 'pending' AND f.action_user_id != ? AND u.id != ?)`,
            [userId, userId, userId, userId]
        );
        res.json(requests);
    } catch (error) {
        console.error("Get friend requests error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Unfriend a user
router.post('/friends/unfriend', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.body;
        const currentUserId = req.user.id;
        const userOneId = Math.min(currentUserId, friendId);
        const userTwoId = Math.max(currentUserId, friendId);
        await db.query(
            'DELETE FROM friendships WHERE user_one_id = ? AND user_two_id = ?',
            [userOneId, userTwoId]
        );
        res.status(200).json({ message: 'Friend removed successfully.' });
    } catch (error) {
        console.error("Unfriend error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Block a user
router.post('/friends/block', authenticateToken, async (req, res) => {
    try {
        const { userIdToBlock } = req.body;
        const currentUserId = req.user.id;
        if (userIdToBlock === currentUserId) return res.status(400).json({ message: "You cannot block yourself." });
        const userOneId = Math.min(currentUserId, userIdToBlock);
        const userTwoId = Math.max(currentUserId, userIdToBlock);
        await db.query(
            `INSERT INTO friendships (user_one_id, user_two_id, status, action_user_id) 
             VALUES (?, ?, 'blocked', ?) 
             ON DUPLICATE KEY UPDATE status = 'blocked', action_user_id = ?`,
            [userOneId, userTwoId, currentUserId, currentUserId]
        );
        res.status(200).json({ message: 'User blocked successfully.' });
    } catch (error) {
        console.error("Block user error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ROUTE ใหม่สำหรับอัปเดตธีม
router.put('/friends/theme', authenticateToken, async (req, res) => {
    try {
        const { friendId, theme } = req.body;
        const currentUserId = req.user.id;
        const userOneId = Math.min(currentUserId, friendId);
        const userTwoId = Math.max(currentUserId, friendId);

        const [result] = await db.query(
            `UPDATE friendships SET chat_theme = ? WHERE user_one_id = ? AND user_two_id = ?`,
            [theme, userOneId, userTwoId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Friendship not found." });
        }

        res.status(200).json({ message: 'Theme updated successfully.' });

    } catch (error) {
        console.error("Update theme error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;