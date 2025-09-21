// src/routes/groups.js
const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

// ... (โค้ดส่วน Create a new group, Get all groups, invitations เหมือนเดิม) ...
router.post('/', authenticateToken, async (req, res) => {
    const { name, members } = req.body;
    const creatorId = req.user.id;

    if (!name || !members || !Array.isArray(members)) {
        return res.status(400).json({ message: 'Group name and members are required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Create the group
        const [groupResult] = await connection.query('INSERT INTO `groups` (name, creator_id) VALUES (?, ?)', [name, creatorId]);
        const groupId = groupResult.insertId;

        // Add the creator as an accepted member
        await connection.query('INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)', [groupId, creatorId, 'accepted']);

        // Add other members as pending invitations
        if (members.length > 0) {
            const memberValues = members.map(userId => [groupId, userId, 'pending']);
            await connection.query('INSERT IGNORE INTO group_members (group_id, user_id, status) VALUES ?', [memberValues]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Group created and invitations sent', groupId });
    } catch (error) {
        await connection.rollback();
        console.error("Create group error:", error);
        res.status(500).json({ message: 'Failed to create group' });
    } finally {
        connection.release();
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [groups] = await db.query(
            `SELECT g.id, g.name FROM \`groups\` g 
             JOIN group_members gm ON g.id = gm.group_id 
             WHERE gm.user_id = ? AND gm.status = 'accepted'`,
            [req.user.id]
        );
        res.json(groups);
    } catch (error) {
        console.error("Get groups error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/invitations', authenticateToken, async (req, res) => {
    try {
        const [invitations] = await db.query(
            `SELECT g.id, g.name, u.username as inviter FROM \`groups\` g 
             JOIN group_members gm ON g.id = gm.group_id 
             JOIN users u ON g.creator_id = u.id 
             WHERE gm.user_id = ? AND gm.status = 'pending'`,
            [req.user.id]
        );
        res.json(invitations);
    } catch (error) {
        console.error("Get group invitations error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/invitations/respond', authenticateToken, async (req, res) => {
    try {
        const { groupId, response } = req.body; // response can be 'accept' or 'reject'
        const userId = req.user.id;

        if (!groupId || !response) {
            return res.status(400).json({ message: 'Group ID and response are required.' });
        }

        if (response === 'accept') {
            await db.query("UPDATE group_members SET status = 'accepted' WHERE group_id = ? AND user_id = ? AND status = 'pending'", [groupId, userId]);
            res.json({ message: "Invitation accepted." });
        } else if (response === 'reject') {
            await db.query("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending'", [groupId, userId]);
            res.json({ message: "Invitation rejected." });
        } else {
            res.status(400).json({ message: "Invalid response." });
        }
    } catch (error) {
        console.error("Respond to invitation error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ** แก้ไข: ให้ดึง chat_theme มาด้วย **
router.get('/:groupId', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const [groupInfo] = await db.query('SELECT id, name, creator_id, chat_theme FROM `groups` WHERE id = ?', [groupId]);
        
        if (groupInfo.length === 0) {
            return res.status(404).json({ message: 'Group not found.' });
        }
        
        const [members] = await db.query(
            `SELECT u.id, u.username, u.avatar_url FROM users u 
             JOIN group_members gm ON u.id = gm.user_id 
             WHERE gm.group_id = ? AND gm.status = 'accepted'`,
            [groupId]
        );
        
        res.json({ ...groupInfo[0], members });
    } catch (error) {
        console.error("Get group details error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ... (โค้ดส่วน Get group's message history เหมือนเดิม) ...
router.get('/:groupId/messages', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const [messages] = await db.query(
            `SELECT gm.id, gm.message_text as text, gm.timestamp, u.username as sender, u.avatar_url as senderAvatar 
             FROM group_messages gm JOIN users u ON gm.sender_id = u.id 
             WHERE gm.group_id = ? ORDER BY gm.timestamp ASC`, 
            [groupId]
        );
        res.json(messages);
    } catch (error) {
        console.error("Get group messages error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ** ROUTE ใหม่สำหรับอัปเดตธีม **
router.put('/:groupId/theme', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { theme } = req.body;
        
        // หมายเหตุ: คุณต้องเพิ่มคอลัมน์ 'chat_theme' ในตาราง 'groups' ก่อน
        // ALTER TABLE `groups` ADD COLUMN chat_theme VARCHAR(255) DEFAULT 'default';
        const [result] = await db.query(
            'UPDATE `groups` SET chat_theme = ? WHERE id = ?',
            [theme, groupId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Group not found." });
        }
        
        // (Optional) แจ้งเตือนคนในกลุ่มผ่าน Socket
        req.io.to(`group_${groupId}`).emit('group theme updated', { groupId, newTheme: theme });

        res.status(200).json({ message: 'Theme updated successfully.' });

    } catch (error) {
        console.error("Update group theme error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ... (โค้ดส่วนที่เหลือเหมือนเดิม) ...
router.put('/:groupId/name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const { groupId } = req.params;
        if (!name) return res.status(400).json({ message: 'New name is required.' });
        
        await db.query('UPDATE `groups` SET name = ? WHERE id = ?', [name, groupId]);
        
        // Use req.io to emit socket event
        req.io.to(`group_${groupId}`).emit('group name updated', { groupId, newName: name });
        
        res.status(200).json({ message: 'Group name updated.' });
    } catch (error) {
        console.error("Update group name error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:groupId/members', authenticateToken, async (req, res) => {
    try {
        const { members } = req.body;
        const { groupId } = req.params;
        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ message: 'Member IDs are required.' });
        }
        
        const memberValues = members.map(userId => [groupId, userId, 'pending']);
        await db.query('INSERT IGNORE INTO group_members (group_id, user_id, status) VALUES ?', [memberValues]);
        
        res.status(200).json({ message: 'Invitations sent successfully.' });
    } catch (error) {
        console.error("Invite members error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:groupId/leave', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUserId = req.user.id;
        const [result] = await db.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, currentUserId]);
        
        if (result.affectedRows > 0) {
            const notification = { 
                text: `${req.user.username} has left the group.`, 
                sender: 'System', 
                timestamp: new Date() 
            };
            // Use req.io to emit socket event
            req.io.to(`group_${groupId}`).emit('system message', notification);
            res.status(200).json({ message: 'You have left the group.' });
        } else {
            res.status(404).json({ message: 'You are not a member of this group.' });
        }
    } catch (error) {
        console.error("Leave group error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:groupId', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUserId = req.user.id;
        
        const [group] = await db.query('SELECT creator_id FROM `groups` WHERE id = ?', [groupId]);
        if (group.length === 0 || group[0].creator_id !== currentUserId) {
            return res.status(403).json({ message: "Only the group creator can disband the group." });
        }
        
        await db.query('DELETE FROM `groups` WHERE id = ?', [groupId]);
        
        // Use req.io to notify members
        req.io.to(`group_${groupId}`).emit('group disbanded', { groupId, message: 'The group has been disbanded by the creator.' });
        
        res.status(200).json({ message: 'Group disbanded successfully.' });
    } catch (error) {
        console.error("Disband group error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;