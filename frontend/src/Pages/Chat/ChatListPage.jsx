import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import Avatar from '../../Components/Common/Avatar';

const ChatListPage = () => {
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchConversations = useCallback(async (query) => {
        // Don't set loading on every search for better UX
        if (query === '') setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = query
                ? `${SERVER_URL}/api/conversations?q=${encodeURIComponent(query)}`
                : `${SERVER_URL}/api/conversations`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setConversations(data);
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchConversations(searchQuery);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery, fetchConversations]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const activeStyle = {
        backgroundColor: '#EFF6FF', // bg-blue-50
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b">
                <h1 className="text-2xl font-bold">Chats</h1>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                     <p className="text-center text-gray-500 mt-4">Loading...</p>
                ) : conversations.length > 0 ? (
                    conversations.map(convo => (
                        <NavLink
                            key={`${convo.type}-${convo.id}`}
                            to={convo.type === 'group' ? `/group/${convo.id}` : `/chat/${convo.name}`}
                            style={({ isActive }) => isActive ? activeStyle : undefined}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors w-full"
                        >
                            <div className="flex-shrink-0">
                                <Avatar user={{ username: convo.name, avatar_url: convo.avatar_url }} size="w-12 h-12" />
                            </div>
                            
                            {/* ** จุดแก้ไขหลัก **
                              - เปลี่ยน div นี้ให้เป็น flex container แนวตั้ง (flex flex-col)
                              - ยังคง flex-1 และ min-w-0 ไว้เหมือนเดิม
                            */}
                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold truncate text-gray-800">{convo.name}</p>
                                    <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTimestamp(convo.lastMessageTimestamp)}</p>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{convo.lastMessage || 'No messages yet'}</p>
                            </div>
                        </NavLink>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-4">
                        {searchQuery 
                            ? `No chats found for "${searchQuery}"` 
                            : "You have no active conversations."
                        }
                    </p>
                )}
            </div>
        </div>
    );
};

export default ChatListPage;