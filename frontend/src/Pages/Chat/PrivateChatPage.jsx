import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import Message from '../../Components/Common/Message';
import MessageInput from '../../Components/Common/MessageInput';
import ImageModal from '../../Components/Modals/ImageModal';
import Avatar from '../../Components/Common/Avatar';

const PrivateChatPage = ({ socket, currentUser }) => {
    const { username: peerUsername } = useParams();
    const [messages, setMessages] = useState([]);
    const [peerUser, setPeerUser] = useState(null);
    const [friendship, setFriendship] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPeerTyping, setIsPeerTyping] = useState(false);
    const [pastedImage, setPastedImage] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const messagesEndRef = useRef(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [historyRes, profileRes] = await Promise.all([
                fetch(`${SERVER_URL}/api/chat/history/${peerUsername}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${SERVER_URL}/api/users/profile/${peerUsername}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            if (!historyRes.ok || !profileRes.ok) throw new Error("Failed to fetch chat data.");

            const historyData = await historyRes.json();
            const profileData = await profileRes.json();

            setMessages(historyData);
            setPeerUser(profileData.user);
            setFriendship(profileData.friendship);

        } catch (error) {
            console.error("Failed to load chat data", error);
        } finally {
            setIsLoading(false);
        }
    }, [peerUsername]);

    useEffect(() => {
        fetchData();
        // Reset state when peer changes
        setMessages([]);
        setPeerUser(null);
        setIsMenuOpen(false);
    }, [fetchData, peerUsername]);

    useEffect(() => {
        if (!socket || !peerUser) return;

        socket.emit('mark as read', { peerUsername });

        const handlePrivateMessage = (newMessage) => {
            const isRelevant =
                (newMessage.senderId === currentUser.id && newMessage.receiverId === peerUser?.id) ||
                (newMessage.senderId === peerUser?.id && newMessage.receiverId === currentUser.id);

            if (isRelevant) {
                setMessages(prev => [...prev, newMessage]);
                if (newMessage.senderId === peerUser.id) {
                    socket.emit('mark as read', { peerUsername });
                }
            }
        };
        
        const handleMessagesRead = ({ readerUsername }) => {
            if (readerUsername === peerUsername) {
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.sender === currentUser.username ? { ...msg, is_read: true } : msg
                    )
                );
            }
        };

        const handleUserTyping = ({ username }) => {
            if (username === peerUsername) setIsPeerTyping(true);
        };

        const handleUserStoppedTyping = ({ username }) => {
            if (username === peerUsername) setIsPeerTyping(false);
        };

        const handleMessageBlocked = ({ message }) => alert(message);

        socket.on('private message', handlePrivateMessage);
        socket.on('messages were read', handleMessagesRead);
        socket.on('user typing', handleUserTyping);
        socket.on('user stopped typing', handleUserStoppedTyping);
        socket.on('message blocked', handleMessageBlocked);

        return () => {
            socket.off('private message', handlePrivateMessage);
            socket.off('messages were read', handleMessagesRead);
            socket.off('user typing', handleUserTyping);
            socket.off('user stopped typing', handleUserStoppedTyping);
            socket.off('message blocked', handleMessageBlocked);
        };
    }, [socket, currentUser.id, peerUser, peerUsername]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isPeerTyping]);
    
    const handleImageClick = (imageUrl) => {
        setViewingImage(imageUrl);
    };

    const handleSendMessage = (text) => {
        if (!socket || !peerUser) return;
        socket.emit('private message', { content: text, toUserId: peerUser.id, type: 'text' });
    };

    const handleSendFile = async (file) => {
        if (!socket || !peerUser) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large! Maximum size is 2 MB.");
            return;
        }
        const formData = new FormData();
        formData.append('chatImage', file);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${SERVER_URL}/api/chat/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to upload file.');
            socket.emit('private message', { content: data.url, toUserId: peerUser.id, type: 'image' });
        } catch (error) {
            console.error("File upload error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleImagePasted = (file) => {
        if (file && file.type.startsWith('image/')) {
            setPastedImage(file);
        }
    };

    const handleConfirmSendPastedImage = () => {
        if (pastedImage) {
            handleSendFile(pastedImage);
            setPastedImage(null);
        }
    };

    const handleCancelPastedImage = () => {
        setPastedImage(null);
    };
    
    const handleTyping = (action) => {
        if (!socket || !peerUser) return;
        socket.emit(action === 'start' ? 'start typing' : 'stop typing', { toUserId: peerUser.id });
    };

    const handleBlockUser = async () => {
        if (!peerUser) return;
        if (window.confirm(`Are you sure you want to block ${peerUser.username}?`)) {
            try {
                const token = localStorage.getItem('token');
                await fetch(`${SERVER_URL}/api/friends/block`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ userIdToBlock: peerUser.id })
                });
                fetchData();
            } catch (error) {
                console.error("Failed to block user", error);
            }
        }
    };

    if (isLoading || !peerUser) return <div className="flex items-center justify-center h-full"><p>Loading chat...</p></div>;

    const isBlocked = friendship && friendship.status === 'blocked';
    const amIBlocked = isBlocked && friendship.action_user_id !== currentUser.id;

    return (
        <>
            <div className="flex flex-col h-screen">
                <header className="bg-white shadow-sm p-3 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="relative" ref={menuRef}>
                            <div 
                                className="flex items-center gap-3 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
                                onClick={() => setIsMenuOpen(prev => !prev)}
                            >
                                <Avatar user={peerUser} size="w-10 h-10" />
                                <h1 className="text-xl font-bold">{peerUsername}</h1>
                            </div>

                            {isMenuOpen && (
                                <div className="absolute top-full mt-2 w-56 bg-white rounded-md shadow-lg z-20 border py-1">
                                    <ul>
                                        <li>
                                            <Link 
                                                to={`/profile/${peerUsername}`} 
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                View Profile
                                            </Link>
                                        </li>
                                        {!isBlocked && (
                                            <li>
                                                <button 
                                                    onClick={() => {
                                                        handleBlockUser();
                                                        setIsMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                                >
                                                    Block {peerUsername}
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    {messages.map((msg) => {
                        const lastMessageSentByMe = [...messages].reverse().find(m => m.sender === currentUser.username);
                        const isLastMessage = msg.id === lastMessageSentByMe?.id;
                        const hasBeenRead = lastMessageSentByMe?.is_read;
                        return (
                            <Message
                                key={msg.id}
                                msg={msg}
                                currentUser={currentUser.username}
                                isLastMessage={isLastMessage}
                                hasBeenRead={hasBeenRead}
                                onImageClick={handleImageClick}
                            />
                        );
                    })}
                    {isPeerTyping && (
                        <div className="flex justify-start mb-4">
                            <div className="flex flex-col items-start max-w-full">
                                <span className="text-xs text-gray-500 ml-3 mb-1">{peerUsername}</span>
                                <div className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 rounded-bl-none">
                                    <p className="text-sm italic">is typing...</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                {amIBlocked ? (
                    <div className="bg-white p-4 text-center text-red-500 border-t">
                        You are blocked by this user and cannot send messages.
                    </div>
                ) : isBlocked && !amIBlocked ? (
                    <div className="bg-white p-4 text-center text-gray-500 border-t">
                        You have blocked this user. <Link to={`/profile/${peerUsername}`} className="text-blue-500 hover:underline">Visit their profile</Link> to manage.
                    </div>
                ) : (
                    <>
                        {pastedImage && (
                            <div className="bg-white p-3 border-t border-gray-200">
                                <div className="relative max-w-4xl mx-auto p-2 border border-dashed rounded-lg">
                                    <p className="text-sm text-gray-600 mb-2">Send this image?</p>
                                    <img
                                        src={URL.createObjectURL(pastedImage)}
                                        alt="Pasted preview"
                                        className="max-h-40 rounded-md"
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={handleConfirmSendPastedImage} className="bg-blue-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-blue-600">Send</button>
                                        <button onClick={handleCancelPastedImage} className="bg-gray-200 px-4 py-1 rounded-lg text-sm hover:bg-gray-300">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            onSendFile={handleSendFile}
                            onTyping={handleTyping}
                            onImagePasted={handleImagePasted}
                        />
                    </>
                )}
            </div>
            
            <ImageModal src={viewingImage} onClose={() => setViewingImage(null)} />
        </>
    );
};

export default PrivateChatPage;