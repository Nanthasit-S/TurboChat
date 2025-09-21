// src/socket/socketHandler.js
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET;

const userSockets = new Map(); // Map<userId, socketId>

// Helper function to get a user's friends' IDs
const getFriends = async (userId) => {
    const [friends] = await db.query(
        `SELECT u.id FROM users u 
         JOIN friendships f ON (f.user_one_id = u.id OR f.user_two_id = u.id) 
         WHERE (f.user_one_id = ? OR f.user_two_id = ?) 
         AND f.status = 'accepted' AND u.id != ?`,
        [userId, userId, userId]
    );
    return friends.map(f => f.id);
};

// Helper function to get online friends who have their status visible
const getVisibleOnlineFriends = async (userId) => {
    const friendIds = await getFriends(userId);
    const onlineFriendIds = [];
    for (const friendId of friendIds) {
        if (userSockets.has(friendId)) {
            const [friendData] = await db.query('SELECT show_online_status FROM users WHERE id = ?', [friendId]);
            if (friendData.length > 0 && friendData[0].show_online_status) {
                onlineFriendIds.push(friendId);
            }
        }
    }
    return onlineFriendIds;
};


function initializeSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:5173"],
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: Token not provided'));
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return next(new Error('Authentication error: Invalid token'));
            socket.user = user;
            next();
        });
    });

    io.on('connection', async (socket) => {
        console.log(`Socket connected: ${socket.user.username} (ID: ${socket.user.id})`);
        userSockets.set(socket.user.id, socket.id);

        try {
            // Set user as online (last_seen = NULL)
            await db.query('UPDATE users SET last_seen = NULL WHERE id = ?', [socket.user.id]);
            const [userData] = await db.query('SELECT show_online_status FROM users WHERE id = ?', [socket.user.id]);
            socket.user.show_online_status = userData[0].show_online_status;

            // Notify friends that this user is online (if their status is visible)
            if (socket.user.show_online_status) {
                const friends = await getFriends(socket.user.id);
                friends.forEach(friendId => {
                    const friendSocketId = userSockets.get(friendId);
                    if (friendSocketId) {
                        io.to(friendSocketId).emit('user online', { userId: socket.user.id });
                    }
                });
            }

            // Send the list of currently online (and visible) friends to the newly connected user
            if (socket.user.show_online_status) {
                const onlineFriends = await getVisibleOnlineFriends(socket.user.id);
                socket.emit('friends status', { onlineUserIds: onlineFriends });
            }

            // Auto-join user to their group rooms
            const [groups] = await db.query("SELECT group_id FROM group_members WHERE user_id = ? AND status = 'accepted'", [socket.user.id]);
            groups.forEach(group => socket.join(`group_${group.group_id}`));

        } catch(e) {
            console.error("Error during connection setup:", e);
        }

        // --- STATUS EVENTS ---
        socket.on('update online visibility', async ({ isVisible }) => {
            try {
                await db.query('UPDATE users SET show_online_status = ? WHERE id = ?', [isVisible, socket.user.id]);
                socket.user.show_online_status = isVisible;

                const friends = await getFriends(socket.user.id);
                const eventName = isVisible ? 'user online' : 'user offline';
                
                friends.forEach(friendId => {
                    const friendSocketId = userSockets.get(friendId);
                    if (friendSocketId) {
                        io.to(friendSocketId).emit(eventName, { userId: socket.user.id });
                    }
                });

                // Send updated list of visible friends back to the user
                if (isVisible) {
                    const onlineFriends = await getVisibleOnlineFriends(socket.user.id);
                    socket.emit('friends status', { onlineUserIds: onlineFriends });
                } else {
                    // If user hides their status, they can't see others' status either
                    socket.emit('friends status', { onlineUserIds: [] });
                }

            } catch (error) {
                console.error("Error updating online visibility:", error);
            }
        });


        // --- CHAT EVENTS ---
        socket.on('private message', async ({ content, toUserId, type = 'text' }) => {
            const senderId = socket.user.id;
            try {
                const [friendship] = await db.query('SELECT * FROM friendships WHERE (user_one_id = ? AND user_two_id = ?)', [Math.min(senderId, toUserId), Math.max(senderId, toUserId)]);
                if (friendship.length > 0 && friendship[0].status === 'blocked' && friendship[0].action_user_id !== senderId) {
                    return socket.emit('message blocked', { message: "You cannot send messages to this user." });
                }

                const [senderInfo] = await db.query('SELECT username, avatar_url FROM users WHERE id = ?', [senderId]);
                const messageData = {
                    text: content, type: type, senderId, receiverId: toUserId,
                    sender: senderInfo[0].username, senderAvatar: senderInfo[0].avatar_url,
                    timestamp: new Date(), is_read: false
                };

                const [result] = await db.query('INSERT INTO private_messages (sender_id, receiver_id, message_text, message_type, timestamp) VALUES (?, ?, ?, ?, ?)', [senderId, toUserId, content, type, messageData.timestamp]);
                messageData.id = result.insertId;

                const receiverSocketId = userSockets.get(toUserId);
                if (receiverSocketId) io.to(receiverSocketId).emit('private message', messageData);
                socket.emit('private message', messageData);
            } catch (error) {
                console.error('Error handling private message:', error);
            }
        });

        socket.on('group message', async ({ content, groupId, type = 'text' }) => {
            const senderId = socket.user.id;
            try {
                const [senderInfo] = await db.query('SELECT username, avatar_url FROM users WHERE id = ?', [senderId]);
                const messageData = { 
                    text: content, type: type, sender: senderInfo[0].username, 
                    senderAvatar: senderInfo[0].avatar_url, senderId: senderId, 
                    groupId: groupId, timestamp: new Date() 
                };
                await db.query('INSERT INTO group_messages (group_id, sender_id, message_text, message_type, timestamp) VALUES (?, ?, ?, ?, ?)', [groupId, senderId, content, type, messageData.timestamp]);
                io.to(`group_${groupId}`).emit('group message', messageData);
            } catch (error) {
                console.error('Error sending group message:', error);
            }
        });

        socket.on('mark as read', async ({ peerUsername }) => {
            const currentUserId = socket.user.id;
            try {
                const [peerUsers] = await db.query('SELECT id FROM users WHERE username = ?', [peerUsername]);
                if (peerUsers.length > 0) {
                    const peerUserId = peerUsers[0].id;
                    await db.query('UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0', [peerUserId, currentUserId]);
                    const peerSocketId = userSockets.get(peerUserId);
                    if (peerSocketId) io.to(peerSocketId).emit('messages were read', { readerUsername: socket.user.username });
                }
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        socket.on('start typing', ({ toUserId, groupId }) => {
            if (toUserId) {
                const receiverSocketId = userSockets.get(toUserId);
                if (receiverSocketId) socket.to(receiverSocketId).emit('user typing', { username: socket.user.username });
            } else if (groupId) {
                socket.to(`group_${groupId}`).emit('user typing', { username: socket.user.username, groupId });
            }
        });

        socket.on('stop typing', ({ toUserId, groupId }) => {
            if (toUserId) {
                const receiverSocketId = userSockets.get(toUserId);
                if (receiverSocketId) socket.to(receiverSocketId).emit('user stopped typing', { username: socket.user.username });
            } else if (groupId) {
                socket.to(`group_${groupId}`).emit('user stopped typing', { username: socket.user.username, groupId });
            }
        });

        // --- FRIEND REQUEST EVENTS ---
        socket.on('send friend request', async ({ receiverId }) => {
            const senderId = socket.user.id;
            try {
                if (receiverId === senderId) return socket.emit('friend request error', { message: "You cannot add yourself." });
                const userOneId = Math.min(senderId, receiverId);
                const userTwoId = Math.max(senderId, receiverId);
                await db.query('INSERT INTO friendships (user_one_id, user_two_id, status, action_user_id) VALUES (?, ?, \'pending\', ?) ON DUPLICATE KEY UPDATE status = \'pending\', action_user_id = ?', [userOneId, userTwoId, senderId, senderId]);
                const receiverSocketId = userSockets.get(receiverId);
                if (receiverSocketId) {
                    const [senderInfo] = await db.query('SELECT id, username, avatar_url FROM users WHERE id = ?', [senderId]);
                    io.to(receiverSocketId).emit('new friend request', { sender: senderInfo[0] });
                }
                socket.emit('friend request sent', { receiverId });
            } catch (error) {
                console.error('Error sending friend request:', error);
                socket.emit('friend request error', { message: "Server error while sending request." });
            }
        });

        socket.on('respond to friend request', async ({ senderId, status }) => {
            const receiverId = socket.user.id;
            try {
                if (!['accepted', 'rejected'].includes(status)) return socket.emit('friend response error', { message: 'Invalid status.' });
                const userOneId = Math.min(senderId, receiverId);
                const userTwoId = Math.max(senderId, receiverId);
                const [result] = await db.query('UPDATE friendships SET status = ?, action_user_id = ? WHERE user_one_id = ? AND user_two_id = ? AND status = \'pending\' AND action_user_id = ?', [status, receiverId, userOneId, userTwoId, senderId]);
                if (result.affectedRows === 0) return socket.emit('friend response error', { message: 'Friend request not found or already handled.' });
                if (status === 'accepted') {
                    const senderSocketId = userSockets.get(senderId);
                    if (senderSocketId) {
                        const [responderInfo] = await db.query('SELECT id, username, avatar_url FROM users WHERE id = ?', [receiverId]);
                        io.to(senderSocketId).emit('friend request accepted', { responder: responderInfo[0] });
                    }
                }
                socket.emit('friend response success', { senderId, status });
            } catch (error) {
                 console.error('Error responding to friend request:', error);
                 socket.emit('friend response error', { message: "Server error while responding." });
            }
        });

        // --- DISCONNECT ---
        socket.on('disconnect', async () => {
            console.log(`Socket disconnected: ${socket.user.username}`);
            userSockets.delete(socket.user.id);
            try {
                // Update last_seen timestamp in the database
                await db.query('UPDATE users SET last_seen = ? WHERE id = ?', [new Date(), socket.user.id]);
                
                // Notify friends that this user is offline (only if they were visible)
                if (socket.user.show_online_status) {
                    const friends = await getFriends(socket.user.id);
                    friends.forEach(friendId => {
                        const friendSocketId = userSockets.get(friendId);
                        if (friendSocketId) {
                            io.to(friendSocketId).emit('user offline', { userId: socket.user.id });
                        }
                    });
                }
            } catch (error) {
                console.error("Error during disconnect:", error);
            }
        });
    });

    return io;
}

module.exports = { initializeSocket };