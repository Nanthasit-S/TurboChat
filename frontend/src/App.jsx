import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

import Layout from './Components/Layout';
import LoginPage from './Pages/Auth/LoginPage';
import RegisterPage from './Pages/Auth/RegisterPage';
import SearchPage from './Pages/Search/SearchPage';
import ProfilePage from './Pages/Profile/ProfilePage';
import FriendsPage from './Pages/Friends/FriendsPage';
import PrivateChatPage from './Pages/Chat/PrivateChatPage';
import GroupChatPage from './Pages/Chat/GroupChatPage';
import SettingsPage from './Pages/Setting/SettingsPage';
import { SERVER_URL } from './config';

const App = () => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewFriendRequest, setHasNewFriendRequest] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserSession = async () => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        try {
          const response = await fetch(`${SERVER_URL}/api/check-session`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
          if (response.ok) {
            const data = await response.json();
            handleLoginSuccess(currentToken, data.user);
          } else {
            handleLogout();
          }
        } catch (error) {
          handleLogout();
        }
      }
      setIsLoading(false);
    };
    checkUserSession();
  }, []);

  useEffect(() => {
    if (user && token) {
      const newSocket = io(SERVER_URL, { auth: { token } });
      newSocket.on('connect_error', (err) => { if (err.message.includes("Invalid token")) handleLogout(); });
      setSocket(newSocket);
      
      newSocket.on('new friend request', () => {
        setHasNewFriendRequest(true);
      });

      newSocket.on('friends status', ({ onlineUserIds }) => {
        setOnlineFriends(new Set(onlineUserIds));
      });
      newSocket.on('user online', ({ userId }) => {
        setOnlineFriends(prev => new Set(prev).add(userId));
      });
      newSocket.on('user offline', ({ userId }) => {
        setOnlineFriends(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
        });
      });

      return () => {
        newSocket.off('new friend request');
        newSocket.off('friends status');
        newSocket.off('user online');
        newSocket.off('user offline');
        newSocket.close();
      }
    }
  }, [user, token]);

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', userData.username);
    try {
        const decodedToken = jwtDecode(newToken);
        localStorage.setItem('userId', decodedToken.id);
        setUser({ 
            id: decodedToken.id, 
            username: userData.username, 
            avatar_url: userData.avatar_url,
            show_online_status: userData.show_online_status 
        });
    } catch (error) {
        console.log("Error decoding token:", error);
        handleLogout();
    }
  };
  
  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    handleLoginSuccess(newToken, userData);
    navigate('/chats');
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    if (socket) socket.disconnect();
    setSocket(null);
    navigate('/login');
  };

  const handleSettingsChange = (updates) => {
    if (updates.token) {
        localStorage.setItem('token', updates.token);
        setToken(updates.token);
    }
    if (updates.username) {
        localStorage.setItem('username', updates.username);
    }
    setUser(prevUser => ({
        ...prevUser,
        ...updates
    }));
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  const WelcomeComponent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <h2 className="mt-4 text-2xl font-bold">Welcome to ChatApp</h2>
        <p>Select a chat to start messaging.</p>
    </div>
  );

  return (
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} onSwitchToRegister={() => navigate('/register')} />} />
            <Route path="/register" element={<RegisterPage onSwitchToLogin={() => navigate('/login')} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route 
            path="/" 
            element={<Layout user={user} onLogout={handleLogout} hasNewFriendRequest={hasNewFriendRequest} />}
          >
            <Route index element={<WelcomeComponent />} />
            {/* Routes for main content area */}
            <Route path="chat/:username" element={<PrivateChatPage socket={socket} currentUser={user} onlineFriends={onlineFriends} />} />
            <Route path="group/:groupId" element={<GroupChatPage socket={socket} currentUser={user} />} />
            
            {/* These routes will now also render in the main content area */}
            <Route path="friends" element={<FriendsPage socket={socket} setHasNewFriendRequest={setHasNewFriendRequest} />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="profile/:username" element={<ProfilePage currentUser={user} onAvatarChange={(avatar_url) => handleSettingsChange({ avatar_url })} socket={socket} />} />
            <Route path="settings" element={<SettingsPage currentUser={user} onSettingsChange={handleSettingsChange} socket={socket} />} />
            
            {/* Redirect any other path to the welcome screen */}
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        )}
      </Routes>
  );
};

export default App;