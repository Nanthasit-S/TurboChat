import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import Avatar from '../../Components/Common/Avatar'; // 1. Import Avatar component

const FriendsPage = ({ socket, setHasNewFriendRequest }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [groupInvites, setGroupInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // When entering this page, clear the notification dot
  useEffect(() => {
    setHasNewFriendRequest(false);
  }, [setHasNewFriendRequest]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const token = localStorage.getItem('token');
        const [friendsRes, requestsRes, invitesRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${SERVER_URL}/api/friends/requests`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${SERVER_URL}/api/groups/invitations`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const friendsData = await friendsRes.json();
        const requestsData = await requestsRes.json();
        const invitesData = await invitesRes.json();

        setFriends(friendsData);
        setFriendRequests(requestsData);
        setGroupInvites(invitesData);

    } catch (error) {
        console.error("Failed to fetch data", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (!socket) return;

    const handleNewFriendRequest = (data) => {
        setFriendRequests(prev => [data.sender, ...prev]);
        setHasNewFriendRequest(true);
    };
    
    const handleFriendRequestAccepted = () => {
        fetchData();
    };

    const handleFriendResponseSuccess = ({ senderId, status }) => {
        setFriendRequests(prev => prev.filter(req => req.id !== senderId));
        if (status === 'accepted') {
            fetchData();
        }
    };

    socket.on('new friend request', handleNewFriendRequest);
    socket.on('friend request accepted', handleFriendRequestAccepted);
    socket.on('friend response success', handleFriendResponseSuccess);

    return () => {
        socket.off('new friend request', handleNewFriendRequest);
        socket.off('friend request accepted', handleFriendRequestAccepted);
        socket.off('friend response success', handleFriendResponseSuccess);
    };
  }, [fetchData, socket, setHasNewFriendRequest]);
  
  const handleFriendRequestResponse = (senderId, status) => {
      if (socket) {
        socket.emit('respond to friend request', { senderId, status });
      }
  };

  const handleUnfriend = async (friendId) => {
      if (window.confirm("Are you sure you want to remove this friend?")) {
          try {
              const token = localStorage.getItem('token');
              await fetch(`${SERVER_URL}/api/friends/unfriend`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ friendId })
              });
              fetchData();
          } catch (error) {
              console.error("Failed to unfriend", error);
          }
      }
  };

  const handleGroupInviteResponse = async (groupId, response) => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${SERVER_URL}/api/groups/invitations/respond`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ groupId, response })
        });
        fetchData();
      } catch (error) {
          console.error("Failed to respond to group invite", error);
      }
  };

  if (isLoading) return <p className="text-center mt-8">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Notifications Column */}
      <div className="space-y-8">
        {/* Group Invitations Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Group Invitations</h1>
            <div className="space-y-3">
            {groupInvites.length > 0 ? (
                groupInvites.map(invite => (
                <div key={invite.id} className="bg-gray-50 p-3 rounded-lg">
                    <p className="mb-2">
                        <span className="font-semibold">{invite.inviter}</span> invited you to join <span className="font-semibold">{invite.name}</span>
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => handleGroupInviteResponse(invite.id, 'accept')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-sm rounded-md">Accept</button>
                        <button onClick={() => handleGroupInviteResponse(invite.id, 'reject')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm rounded-md">Decline</button>
                    </div>
                </div>
                ))
            ) : ( <p className="text-gray-500">No new group invitations.</p> )}
            </div>
        </div>

        {/* Friend Requests Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Friend Requests</h1>
            <div className="space-y-3">
            {friendRequests.length > 0 ? (
                friendRequests.map(user => (
                    <div key={user.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        {/* 2. เพิ่มรูปโปรไฟล์และจัด layout */}
                        <Link to={`/profile/${user.username}`} className="flex items-center gap-3 hover:underline">
                            <Avatar user={user} size="w-10 h-10" />
                            <span className="font-semibold">{user.username}</span>
                        </Link>
                        <div className="flex gap-2">
                            <button onClick={() => handleFriendRequestResponse(user.id, 'accepted')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-sm rounded-md">Accept</button>
                            <button onClick={() => handleFriendRequestResponse(user.id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm rounded-md">Decline</button>
                        </div>
                    </div>
                ))
            ) : ( <p className="text-gray-500">No new friend requests.</p> )}
            </div>
        </div>
      </div>
      
      {/* Friends List Column */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Your Friends</h1>
        <div className="space-y-3">
            {friends.length > 0 ? (
                friends.map(user => (
                    <div key={user.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        {/* 3. เพิ่มรูปโปรไฟล์และจัด layout */}
                        <Link to={`/profile/${user.username}`} className="flex items-center gap-3 hover:underline">
                             <Avatar user={user} size="w-10 h-10" />
                            <span className="font-semibold">{user.username}</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Link to={`/chat/${user.username}`} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded-md">
                                Chat
                            </Link>
                            <button onClick={() => handleUnfriend(user.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded-md">
                                Unfriend
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-gray-500">You don't have any friends yet.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;