// src/routes/posts.js
const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user.id;

        // Validate that the post content is not empty
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Post content cannot be empty.' });
        }

        // Insert the new post into the database
        await db.query(
            'INSERT INTO posts (user_id, content) VALUES (?, ?)',
            [userId, content]
        );

        res.status(201).json({ message: 'Post created successfully.' });
    } catch (error) {
        console.error("Create post error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// You can add more post-related routes here in the future
// For example:
// router.get('/:postId', authenticateToken, async (req, res) => { ... });
// router.delete('/:postId', authenticateToken, async (req, res) => { ... });
// router.put('/:postId', authenticateToken, async (req, res) => { ... });


module.exports = router;