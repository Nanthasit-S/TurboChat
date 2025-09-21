import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import Avatar from '../../Components/Common/Avatar';

const SettingsPage = ({ currentUser, onSettingsChange, socket }) => {
    const [username, setUsername] = useState(currentUser.username);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${SERVER_URL}/api/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                // แจ้ง App.jsx ให้อัปเดต state ทันที
                onSettingsChange({ avatar_url: data.avatar_url });
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUpdateUsername = async (e) => {
        e.preventDefault();
        setError('');
        if (username === currentUser.username) return; // ไม่มีการเปลี่ยนแปลง
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${SERVER_URL}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newUsername: username }),
            });
            const data = await response.json();
            if (response.ok) {
                // แจ้ง App.jsx ให้อัปเดต state และ token ใหม่
                onSettingsChange({
                    username: data.user.username,
                    token: data.token,
                });
                alert("Username updated successfully!");
                navigate('/chats'); // กลับไปหน้าหลัก
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleVisibilityToggle = (e) => {
        const isVisible = e.target.checked;
        if (socket) {
            socket.emit('update online visibility', { isVisible });
            // Update local state immediately for better UX
            onSettingsChange({ show_online_status: isVisible });
        }
    };

    return (
        <div className="max-w-xl mx-auto p-4 font-sans">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6">User Settings</h1>

                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-2">
                        <Avatar user={currentUser} size="w-32 h-32" />
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            className="hidden"
                            accept="image/*"
                        />
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-2 text-xs hover:bg-blue-600"
                            aria-label="Change profile picture"
                        >
                            ✏️
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Click the pencil to change your avatar</p>
                </div>

                {/* Username Section */}
                <form onSubmit={handleUpdateUsername}>
                    <label htmlFor="username" className="font-semibold block mb-2">Username</label>
                    <div className="flex gap-2">
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                            disabled={username === currentUser.username}
                        >
                            Save
                        </button>
                    </div>
                </form>

                {/* Online Status Section */}
                <div className="mt-6 pt-6 border-t">
                    <h2 className="font-semibold mb-2">Privacy Settings</h2>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                            <label htmlFor="online-status-toggle" className="font-medium text-gray-800">Show Online Status</label>
                            <p className="text-xs text-gray-500 mt-1">If turned off, you won't be able to see others' online status either.</p>
                        </div>
                        <label htmlFor="online-status-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="online-status-toggle" 
                                className="sr-only peer"
                                checked={currentUser.show_online_status}
                                onChange={handleVisibilityToggle}
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;