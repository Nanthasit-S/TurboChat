import React from 'react';
import { SERVER_URL } from '../../config';

const Avatar = ({ user, size = 'w-10 h-10', isOnline = false, lastSeen = null, showLastSeenText = false }) => {
    const avatarSrc = user?.avatar_url 
        ? `${SERVER_URL}${user.avatar_url}`
        : `https://ui-avatars.com/api/?name=${user?.username || '?'}&background=random`;

    // Helper function to format the last seen timestamp
    const formatLastSeen = (timestamp) => {
        if (!timestamp) return null;

        const now = new Date();
        const lastSeenDate = new Date(timestamp);
        const secondsPast = (now.getTime() - lastSeenDate.getTime()) / 1000;

        if (secondsPast < 60) {
            return 'Active just now';
        }
        if (secondsPast < 3600) {
            return `Active ${Math.floor(secondsPast / 60)}m ago`;
        }
        if (secondsPast <= 86400) {
            return `Active ${Math.floor(secondsPast / 3600)}h ago`;
        }
        if (secondsPast > 86400) {
            const days = Math.floor(secondsPast / 86400);
            return `Active ${days}d ago`;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`relative ${size} flex-shrink-0`}>
                <img
                    src={avatarSrc}
                    alt={user?.username || 'avatar'}
                    className="w-full h-full rounded-full object-cover border-2 border-gray-200"
                />
                {isOnline && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                )}
            </div>
            {showLastSeenText && !isOnline && lastSeen && (
                <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                    {formatLastSeen(lastSeen)}
                </p>
            )}
        </div>
    );
};

export default Avatar;