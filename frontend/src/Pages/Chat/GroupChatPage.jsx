import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../config';

import Message from '../../Components/Common/Message';
import MessageInput from '../../Components/Common/MessageInput';
import GroupSettingsModal from '../../Components/Modals/GroupSettingsModal';
import ImageModal from '../../Components/Modals/ImageModal';
import ThemeMenu from '../../Components/Modals/ThemeMenu';
import { chatThemes } from '../../Data/themeData';
import Avatar from '../../Components/Common/Avatar'; // Import Avatar

const GroupChatPage = ({ socket, currentUser }) => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [groupInfo, setGroupInfo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State สำหรับเมนูหลัก
    const [currentTheme, setCurrentTheme] = useState('default');
    const [viewingImage, setViewingImage] = useState(null);
    const menuRef = useRef(null);
    const messagesEndRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [infoRes, messagesRes] = await Promise.all([
                fetch(`${SERVER_URL}/api/groups/${groupId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${SERVER_URL}/api/groups/${groupId}/messages`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!infoRes.ok) {
                navigate('/');
                return;
            }

            const infoData = await infoRes.json();
            const messagesData = await messagesRes.json();
            setGroupInfo(infoData);
            setMessages(messagesData);
            setCurrentTheme(infoData.chat_theme || 'default');
        } catch (error) {
            console.error("Failed to load group data", error);
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    }, [groupId, navigate]);

    useEffect(() => {
        setIsLoading(true);
        fetchData();
    }, [groupId, fetchData]);


    useEffect(() => {
        if (!socket) return;

        const handleGroupMessage = (newMessage) => {
            if (String(newMessage.groupId) === String(groupId)) {
                setMessages(prev => [...prev, newMessage]);
            }
        };
        const handleNameUpdate = ({ groupId: updatedGroupId, newName }) => {
            if (String(updatedGroupId) === String(groupId)) {
                setGroupInfo(prev => ({ ...prev, name: newName }));
            }
        };
        const handleThemeUpdate = ({ groupId: updatedGroupId, newTheme }) => {
            if (String(updatedGroupId) === String(groupId)) {
                setCurrentTheme(newTheme);
            }
        };
        const handleGroupDisbanded = ({ groupId: disbandedGroupId }) => {
            if (String(disbandedGroupId) === String(groupId)) {
                alert("This group has been disbanded by the creator.");
                navigate('/');
            }
        };

        socket.on('group message', handleGroupMessage);
        socket.on('group name updated', handleNameUpdate);
        socket.on('group theme updated', handleThemeUpdate);
        socket.on('group disbanded', handleGroupDisbanded);

        return () => {
            socket.off('group message', handleGroupMessage);
            socket.off('group name updated', handleNameUpdate);
            socket.off('group theme updated', handleThemeUpdate);
            socket.off('group disbanded', handleGroupDisbanded);
        };
    }, [socket, groupId, navigate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
                setIsThemeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (text) => {
        if (!socket) return;
        socket.emit('group message', { content: text, groupId, type: 'text' });
    };

    const handleSendFile = async (file) => {
        // ... (โค้ดส่งไฟล์เหมือนเดิม) ...
    };

    const handleImageClick = (imageUrl) => {
        setViewingImage(imageUrl);
    };

    const handleThemeChange = async (themeKey) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${SERVER_URL}/api/groups/${groupId}/theme`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ theme: themeKey })
            });
            setIsThemeMenuOpen(false);
        } catch (error) {
            console.error("Failed to update group theme", error);
        }
    };

    if (isLoading || !groupInfo) return <div className="flex items-center justify-center h-full"><p>Loading group chat...</p></div>;

    return (
        <>
            <div className="flex flex-col h-full bg-white">
                <header className="bg-white shadow-sm p-3 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="relative" ref={menuRef}>
                            {/* ส่วนที่กดเพื่อเปิดเมนู */}
                            <div 
                                className="flex items-center gap-3 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
                                onClick={() => setIsMenuOpen(prev => !prev)}
                            >
                                <Avatar user={{username: groupInfo.name}} size="w-10 h-10" />
                                <div>
                                    <h1 className="text-xl font-bold">{groupInfo.name}</h1>
                                    <p className="text-xs text-gray-500">{groupInfo.members.length} members</p>
                                </div>
                            </div>

                            {/* Dropdown Menu หลัก */}
                            {isMenuOpen && (
                                <div className="absolute top-full mt-2 w-56 bg-white rounded-md shadow-lg z-20 border py-1">
                                    <ul>
                                        <li>
                                            <button
                                                onClick={() => {
                                                    setIsThemeMenuOpen(true);
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Change Theme
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={() => {
                                                    setIsSettingsOpen(true);
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Group Settings
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {/* Theme Menu (จะแสดงผลแยกต่างหาก) */}
                            {isThemeMenuOpen && (
                                <div className="absolute top-full mt-2" style={{ left: '0' }}>
                                    <ThemeMenu onSelectTheme={handleThemeChange} />
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main 
                    className="flex-1 p-4 overflow-y-auto"
                    style={chatThemes[currentTheme].style}
                >
                    {messages.map((msg, index) => (
                        <Message 
                            key={msg.id || index} 
                            msg={msg} 
                            currentUser={currentUser.username}
                            onImageClick={handleImageClick}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </main>
                <MessageInput onSendMessage={handleSendMessage} onSendFile={handleSendFile} />
                {isSettingsOpen && (
                    <GroupSettingsModal 
                        groupInfo={groupInfo}
                        onClose={() => setIsSettingsOpen(false)}
                        onDataChanged={fetchData}
                        currentUser={currentUser}
                    />
                )}
            </div>
            
            <ImageModal src={viewingImage} onClose={() => setViewingImage(null)} />
        </>
    );
};

export default GroupChatPage;