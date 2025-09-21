import React from 'react';
import { SERVER_URL } from '../../config';

// 1. รับ onImageClick prop เข้ามา
const MessageContent = ({ msg, onImageClick }) => {
    if (msg.type === 'image') {
        const imageUrl = `${SERVER_URL}${msg.text}`;
        return (
            <img
                src={imageUrl}
                alt="Chat attachment"
                className="max-w-xs md:max-w-md rounded-lg object-cover cursor-pointer"
                // 2. เปลี่ยน onClick ให้เรียกใช้ onImageClick
                onClick={() => onImageClick(imageUrl)}
            />
        );
    }

    return <p className="text-base break-words">{msg.text}</p>;
};

// 3. ส่ง onImageClick prop ลงไปให้ MessageContent
const Message = ({ msg, currentUser, isLastMessage, hasBeenRead, onImageClick }) => {
  const isSender = msg.sender === currentUser;
  const alignClass = isSender ? 'justify-end' : 'justify-start';
  const bubbleClass = isSender
    ? 'bg-blue-500 text-white rounded-br-none'
    : 'bg-gray-200 text-gray-800 rounded-bl-none';
  
  const paddingClass = msg.type === 'image' ? 'p-1' : 'px-4 py-2';

  return (
    <div className={`flex ${alignClass} mb-4`}>
        <div className="flex flex-col max-w-full">
             {!isSender && <span className="text-xs text-gray-500 ml-3 mb-1">{msg.sender}</span>}
            <div className={`flex items-end gap-2 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`rounded-xl max-w-xs md:max-w-md ${bubbleClass} ${paddingClass}`}>
                    <MessageContent msg={msg} onImageClick={onImageClick} />
                    <p className={`text-xs text-right opacity-70 mt-1 ${msg.type === 'image' ? 'text-white' : ''}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                {isSender && isLastMessage && hasBeenRead && msg.type === 'text' && (
                    <span className="text-xs text-gray-500 self-end">Read</span>
                )}
            </div>
        </div>
    </div>
  );
};

export default Message;