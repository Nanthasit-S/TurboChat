import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../config';

const GroupSettingsModal = ({ groupInfo, onClose, onDataChanged }) => {
    const [groupName, setGroupName] = useState(groupInfo.name);
    const [friends, setFriends] = useState([]);
    const [selectedFriends, setSelectedFriends] = useState(new Set());
    const navigate = useNavigate();
    
    const currentUserId = parseInt(localStorage.getItem('userId'));
    const isCreator = currentUserId === groupInfo.creator_id;

    useEffect(() => {
        const fetchFriends = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` }});
            const allFriends = await res.json();
            const currentMemberIds = new Set(groupInfo.members.map(m => m.id));
            const friendsToInvite = allFriends.filter(f => !currentMemberIds.has(f.id));
            setFriends(friendsToInvite);
        };
        fetchFriends();
    }, [groupInfo.members]);

    const handleSelectFriend = (friendId) => {
        const newSelection = new Set(selectedFriends);
        if (newSelection.has(friendId)) newSelection.delete(friendId);
        else newSelection.add(friendId);
        setSelectedFriends(newSelection);
    };

    const handleNameChange = async () => {
        if (groupName.trim() === groupInfo.name || !groupName.trim()) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${SERVER_URL}/api/groups/${groupInfo.id}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: groupName })
            });
            onDataChanged();
        } catch (error) { console.error("Failed to change name", error); }
    };
    
    const handleInviteMembers = async () => {
        if (selectedFriends.size === 0) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${SERVER_URL}/api/groups/${groupInfo.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ members: Array.from(selectedFriends) })
            });
            onDataChanged();
            setSelectedFriends(new Set());
        } catch (error) { console.error("Failed to invite members", error); }
    };

    const handleLeaveGroup = async () => {
        if (window.confirm("Are you sure you want to leave this group?")) {
            try {
                const token = localStorage.getItem('token');
                await fetch(`${SERVER_URL}/api/groups/${groupInfo.id}/leave`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                navigate('/groups');
            } catch (error) {
                console.error("Failed to leave group", error);
            }
        }
    };

    const handleDisbandGroup = async () => {
        if (window.confirm("Are you sure you want to disband this group? This action cannot be undone.")) {
            try {
                const token = localStorage.getItem('token');
                await fetch(`${SERVER_URL}/api/groups/${groupInfo.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // Socket event will handle navigation for other members
                navigate('/groups'); // Navigate creator immediately
            } catch (error) {
                console.error("Failed to disband group", error);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Group Settings</h2>
                
                <div className="mb-4">
                    <label className="font-semibold block mb-1">Group Name</label>
                    <div className="flex gap-2">
                        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="flex-1 p-2 border rounded" />
                        <button onClick={handleNameChange} className="bg-blue-500 text-white px-3 rounded">Save</button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="font-semibold block mb-1">Current Members</label>
                    <div className="text-sm text-gray-600">
                        {groupInfo.members.map(m => m.username).join(', ')}
                    </div>
                </div>

                {friends.length > 0 ? (
                    <div className="mb-4">
                        <label className="font-semibold block mb-1">Invite More Friends</label>
                        <div className="max-h-32 overflow-y-auto border rounded p-2">
                             {friends.map(friend => (
                                <div key={friend.id} className="flex items-center gap-2 p-1">
                                    <input type="checkbox" id={`add-${friend.id}`} checked={selectedFriends.has(friend.id)} onChange={() => handleSelectFriend(friend.id)} />
                                    <label htmlFor={`add-${friend.id}`}>{friend.username}</label>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleInviteMembers} className="bg-green-500 text-white px-3 py-1 rounded mt-2">Invite Selected</button>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">All of your friends are already in this group.</p>
                )}
                
                <div className="mt-6 pt-4 border-t">
                    {isCreator ? (
                        <button 
                            onClick={handleDisbandGroup}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Disband Group
                        </button>
                    ) : (
                        <button 
                            onClick={handleLeaveGroup}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Leave Group
                        </button>
                    )}
                </div>

                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Close</button>
                </div>
            </div>
        </div>
    );
};

export default GroupSettingsModal;