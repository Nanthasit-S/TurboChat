import React, { useState, useEffect, useRef } from 'react';
import Message from '../Components/Message';
import MessageInput from '../Components/MessageInput';

const ChatPage = ({ socket, user }) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.emit('join public chat');

    socket.on('load public history', (history) => {
      setMessages(history);
    });

    const handlePublicMessage = (msg) => {
      setMessages(prevMessages => [...prevMessages, msg]);
    };
    socket.on('public message', handlePublicMessage);

    return () => {
      socket.off('load public history');
      socket.off('public message', handlePublicMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (text) => {
    socket.emit('public message', { text });
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      <header className="bg-white shadow-sm p-4 border-b">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold">Public Chat Room</h1>
        </div>
      </header>
      <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg, index) => (
            <Message key={index} msg={msg} currentUser={user.username} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatPage;