import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import Avatar from './Avatar';
import ChatsIcon from './Icons/ChatsIcon';
import FriendsIcon from './Icons/FriendsIcon';

const SearchIcon = ({ isActive }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const LogoutIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
);

const Sidebar = ({ user, onLogout, hasNewFriendRequest }) => {
  const commonLinkClass = "flex items-center justify-center p-3 rounded-lg w-full transition-colors";
  const activeLinkStyle = "text-blue-500 bg-blue-100";
  const inactiveLinkStyle = "text-gray-600 hover:bg-gray-100";

  return (
    // ** จุดแก้ไข **
    // - ลบ fixed top-0 left-0 ออก
    // - เพิ่ม h-screen และ flex-shrink-0 เพื่อให้ความสูงเต็มและป้องกันการหดตัว
    <aside className="w-20 bg-white border-r flex flex-col items-center py-4 h-screen flex-shrink-0 z-20">
      <Link to="/" className="mb-8">
      </Link>

      <nav className="flex-1 w-full px-2">
        <ul className="space-y-4">
          <li>
            <NavLink to="/chats" title="Chats" className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
              {({ isActive }) => <ChatsIcon isActive={isActive} />}
            </NavLink>
          </li>
          <li className="relative">
            <NavLink to="/friends" title="Friends" className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
              {({ isActive }) => <FriendsIcon isActive={isActive} />}
            </NavLink>
            {hasNewFriendRequest && (
              <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </li>
          <li>
             <NavLink to="/search" title="Search" className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
              {({ isActive }) => <SearchIcon isActive={isActive} />}
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="w-full flex flex-col items-center space-y-4 px-2">
         <Link to={`/profile/${user.username}`} title="Profile">
            <Avatar user={user} size="w-10 h-10" />
         </Link>
         <button onClick={onLogout} title="Logout" className={`${commonLinkClass} text-red-500 hover:bg-red-50`}>
            <LogoutIcon />
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;