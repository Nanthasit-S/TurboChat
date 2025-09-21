import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Common/Sidebar';
import ChatListPage from '../Pages/Chat/ChatListPage'; // เปลี่ยนเป็น Component ที่แสดง Chat List

const Layout = ({ user, onLogout, hasNewFriendRequest }) => {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar หลัก (ซ้ายสุด) */}
            <Sidebar 
                user={user}
                onLogout={onLogout}
                hasNewFriendRequest={hasNewFriendRequest}
            />

            {/* ส่วนแสดงรายชื่อแชท (คอลัมน์กลาง) */}
            <aside className="w-80 flex-shrink-0 bg-white border-r">
                <ChatListPage currentUser={user} />
            </aside>

            {/* ส่วนแสดงเนื้อหาหลัก (คอลัมน์ขวา) */}
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;