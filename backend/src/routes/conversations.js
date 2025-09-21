const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { q: query } = req.query;

    try {
        const baseGroupQuery = `
            SELECT
                g.id, 'group' AS type, g.name, NULL AS avatar_url,
                gm.message_text AS lastMessage, gm.timestamp AS lastMessageTimestamp
            FROM \`groups\` g
            JOIN group_members g_mem ON g.id = g_mem.group_id
            LEFT JOIN (
                SELECT group_id, message_text, timestamp,
                       ROW_NUMBER() OVER(PARTITION BY group_id ORDER BY timestamp DESC) as rn
                FROM group_messages
            ) gm ON g.id = gm.group_id AND gm.rn = 1
            WHERE g_mem.user_id = ? AND g_mem.status = 'accepted'
        `;
        const groupQuery = query ? `${baseGroupQuery} AND g.name LIKE ?` : baseGroupQuery;
        const groupParams = query ? [userId, `%${query}%`] : [userId];
        const [groupConversations] = await db.query(groupQuery, groupParams);

        const basePrivateQuery = `
            SELECT
                u.id, 'private' AS type, u.username AS name, u.avatar_url,
                pm.message_text AS lastMessage, pm.timestamp AS lastMessageTimestamp
            FROM users u
            JOIN (
                SELECT
                    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_user_id,
                    message_text, timestamp,
                    ROW_NUMBER() OVER(PARTITION BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END ORDER BY timestamp DESC) as rn
                FROM private_messages
                WHERE sender_id = ? OR receiver_id = ?
            ) pm ON u.id = pm.other_user_id AND pm.rn = 1
        `;
        const privateQuery = query ? `${basePrivateQuery} AND u.username LIKE ?` : basePrivateQuery;
        const privateParams = query ? [userId, userId, userId, userId, `%${query}%`] : [userId, userId, userId, userId];
        const [privateConversations] = await db.query(privateQuery, privateParams);

        const allConversations = [...groupConversations, ...privateConversations];
        allConversations.sort((a, b) => {
            if (!a.lastMessageTimestamp) return 1;
            if (!b.lastMessageTimestamp) return -1;
            return new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp);
        });

        res.json(allConversations);

    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;