import React, { useState, useEffect } from 'react';
import { SERVER_URL } from '../../config';

const CreateGroupModal = ({ onClose, onGroupCreated }) => {
    const [friends, setFriends] = useState([]);
    const [selectedFriends, setSelectedFriends] = useState(new Set());
    const [groupName, setGroupName] = useState('');
    
    useEffect(() => {
        const fetchFriends = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` }});
            const data = await res.json();
            setFriends(data);
        };
        fetchFriends();
    }, []);

    const handleSelectFriend = (friendId) => {
        const newSelection = new Set(selectedFriends);
        if (newSelection.has(friendId)) {
            newSelection.delete(friendId);
        } else {
            newSelection.add(friendId);
        }
        setSelectedFriends(newSelection);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            alert("Please provide a group name.");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await fetch(`${SERVER_URL}/api/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: groupName, members: Array.from(selectedFriends) })
            });
            onGroupCreated();
            onClose();
        } catch (error) {
            console.error("Failed to create group", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Create New Group</h2>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full p-2 border rounded mb-4"
                        required
                    />
                    <h3 className="font-semibold mb-2">Invite Friends (Optional):</h3>
                    <div className="max-h-48 overflow-y-auto border rounded p-2 mb-4">
                        {friends.length > 0 ? friends.map(friend => (
                            <div key={friend.id} className="flex items-center gap-2 p-1">
                                <input 
                                    type="checkbox" 
                                    id={`friend-${friend.id}`}
                                    checked={selectedFriends.has(friend.id)}
                                    onChange={() => handleSelectFriend(friend.id)}
                                />
                                <label htmlFor={`friend-${friend.id}`}>{friend.username}</label>
                            </div>
                        )) : <p className="text-sm text-gray-500">You have no friends to invite.</p>}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;