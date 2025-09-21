import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import Avatar from '../../Components/Common/Avatar';

const ProfilePage = ({ currentUser, onAvatarChange, socket }) => {
  const { username } = useParams(); 
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [postContent, setPostContent] = useState('');
  const fileInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/users/profile/${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'User not found');
      }
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
    
    if (!socket) return;
    
    // When our request is sent successfully, refetch profile to update the button state
    const handleRequestSent = () => fetchProfile();
    // When the other user accepts our request, refetch profile
    const handleRequestAccepted = () => fetchProfile();

    socket.on('friend request sent', handleRequestSent);
    socket.on('friend request accepted', handleRequestAccepted);

    return () => {
        socket.off('friend request sent', handleRequestSent);
        socket.off('friend request accepted', handleRequestAccepted);
    }
  }, [fetchProfile, socket]);
  
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${SERVER_URL}/api/users/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        const data = await response.json();
        if (response.ok) {
            fetchProfile();
            onAvatarChange(data.avatar_url);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error("Failed to upload avatar:", error);
    }
  };

  const handleFriendAction = async (action, targetUserId) => {
    // Use socket for sending friend requests
    if (action === 'add') {
        if (socket) {
            socket.emit('send friend request', { receiverId: targetUserId });
        }
        return;
    }

    // Use fetch for other actions like unfriend/unblock
    let url = '';
    let method = 'POST';
    let body = {};
    let confirmMessage = '';

    switch (action) {
        case 'unfriend':
        case 'unblock':
            url = `${SERVER_URL}/api/friends/unfriend`;
            body = { friendId: targetUserId };
            confirmMessage = action === 'unfriend' 
                ? "Are you sure you want to remove this friend?"
                : "Are you sure you want to unblock this user?";
            break;
        default: return;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) return;

    try {
        const token = localStorage.getItem('token');
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        fetchProfile();
    } catch (error) {
        console.error(`Failed to ${action} user`, error);
    }
  }

  const handlePostSubmit = async (e) => {
      e.preventDefault();
      if(!postContent.trim()) return;
      try {
          const token = localStorage.getItem('token');
          await fetch(`${SERVER_URL}/api/posts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ content: postContent })
          });
          setPostContent('');
          fetchProfile();
      } catch (error) {
          console.error("Failed to create post", error);
      }
  }

  const renderFriendButtons = () => {
    if (!profile) return null;
    const { friendship, user: profileUser } = profile;
    
    if (friendship && friendship.status === 'blocked') {
        if (friendship.action_user_id === currentUser.id) {
            return (
                <div className='text-right'>
                    <span className="text-red-500 font-medium block mb-2">You blocked this user.</span>
                    <button onClick={() => handleFriendAction('unblock', profileUser.id)} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md">Unblock</button>
                </div>
            );
        }
        return <span className="text-red-500 font-medium">This user has blocked you.</span>;
    }

    if (friendship && friendship.status === 'accepted') {
        return (
            <div className="flex items-center gap-2">
                <Link to={`/chat/${profileUser.username}`} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">Message</Link>
                <button onClick={() => handleFriendAction('unfriend', profileUser.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md">Unfriend</button>
            </div>
        );
    }
    
    if (friendship && friendship.status === 'pending') {
        return <span className="text-gray-500 font-medium px-4 py-2">Request Sent</span>;
    }

    return (
        <button onClick={() => handleFriendAction('add', profileUser.id)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">Add Friend</button>
    );
  }

  if (isLoading) return <p className="text-center mt-8">Loading profile...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!profile) return null;
  
  const isMyProfile = currentUser.username === profile.user.username;

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center gap-6">
              <div className="relative">
                  <Avatar user={profile.user} size="w-24 h-24" />
                  {isMyProfile && (
                      <>
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleAvatarUpload}
                              className="hidden"
                              accept="image/*"
                          />
                          <button 
                              onClick={() => fileInputRef.current.click()}
                              className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1.5 text-xs hover:bg-blue-600"
                              aria-label="Edit profile picture"
                          >
                              ✏️
                          </button>
                      </>
                  )}
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h1 className="text-3xl font-bold">{profile.user.username}</h1>
                      {!isMyProfile && renderFriendButtons()}
                  </div>
              </div>
          </div>
      </div>
      
      {isMyProfile && (
         <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h2 className="font-bold mb-2">Create a new post</h2>
            <form onSubmit={handlePostSubmit}>
                <textarea 
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="What's on your mind?"
                />
                <button type="submit" className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Post</button>
            </form>
         </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Posts</h2>
        {profile.posts.length > 0 ? (
          profile.posts.map(post => (
            <div key={post.id} className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-gray-800">{post.content}</p>
              <p className="text-xs text-gray-400 mt-2 text-right">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500">This user has no posts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;