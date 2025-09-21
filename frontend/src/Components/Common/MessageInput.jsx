import React, { useState, useRef, useEffect, useMemo } from 'react';
import EmojiIcon from './EmojiIcon';
import { emojiCategories } from '../../data/emojiData';

const AttachmentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const EmojiPicker = React.memo(({ onEmojiSelect }) => {
    const [activeCategory, setActiveCategory] = useState(emojiCategories[0].name);

    const emojiList = useMemo(() => {
        return emojiCategories
            .find(cat => cat.name === activeCategory)
            .emojis.map((emoji, index) => (
                <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => onEmojiSelect(emoji)}
                    className="text-2xl rounded-md hover:bg-gray-200 p-1 transition-colors"
                >
                    {emoji}
                </button>
            ));
    }, [activeCategory, onEmojiSelect]);

    return (
        <div className="absolute bottom-14 left-0 bg-white border rounded-lg shadow-xl w-72 h-80 flex flex-col z-20">
            <div className="flex border-b p-1">
                {emojiCategories.map(category => (
                    <button
                        key={category.name}
                        type="button"
                        onClick={() => setActiveCategory(category.name)}
                        className={`p-2 rounded-md text-xl ${activeCategory === category.name ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        title={category.name}
                    >
                        {category.icon}
                    </button>
                ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-8 gap-1">
                    {emojiList}
                </div>
            </div>
        </div>
    );
});


const MessageInput = ({ onSendMessage, onSendFile, onTyping, onImagePasted }) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
            setShowEmojiPicker(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (onTyping) {
        if (typingTimeoutRef.current === null) {
            onTyping('start');
        } else {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            onTyping('stop');
            typingTimeoutRef.current = null;
        }, 1500);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
      if (onTyping) {
          if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
          }
          onTyping('stop');
          typingTimeoutRef.current = null;
      }
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && onSendFile) {
        onSendFile(file);
    }
    event.target.value = null;
  };

  const handlePaste = (event) => {
    if (!onImagePasted) return;
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
                event.preventDefault();
                onImagePasted(file);
            }
            break; 
        }
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputValue(prev => prev + emoji);
  };

  return (
    <footer className="bg-white p-4 sticky bottom-0 border-t border-gray-200">
      <div className="relative max-w-4xl mx-auto" ref={emojiPickerRef}>
        {showEmojiPicker && <EmojiPicker onEmojiSelect={handleEmojiSelect} />}
        
        <div className="flex items-center gap-2">
          {onSendFile && (
            <>
                <input
                    type="file"
                    // แก้ไขจาก fileInput-ref เป็น fileInputRef
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-gray-500 hover:text-blue-500 transition"
                    aria-label="Attach file"
                >
                    <AttachmentIcon />
                </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="p-2 text-gray-500 hover:text-blue-500 transition"
            aria-label="Select emoji"
          >
            <EmojiIcon />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onPaste={onImagePasted ? handlePaste : undefined}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Type a message..."
            autoComplete="off"
          />
        </div>
      </div>
    </footer>
  );
};

export default MessageInput;