'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/modules/auth/controller/auth.action';

const MENUS = {
  student: [
    { name: 'Bảng Của Tớ', icon: '🏠', path: '/' },
    { name: 'Lớp học', icon: '📚', path: '/classes' },
    { name: 'Lịch Học', icon: '📅', path: '/schedule' },
    { name: 'Nhật Ký', icon: '📝', path: '/diary' },
    { name: 'Hồ Sơ', icon: '🪪', path: '/profile' },
  ],
  teacher: [
    { name: 'Trang chủ', icon: '🏠', path: '/' },
    { name: 'Lớp Học', icon: '🏫', path: '/classes' },
    { name: 'Lịch Dạy', icon: '📅', path: '/schedule' },
    { name: 'Khóa Học', icon: '📚', path: '/courses' },
    { name: 'Chấm Bài', icon: '✅', path: '/grading' },
    { name: 'Nhắn tin', icon: '💬', path: '/chats' },
    { name: 'Hồ Sơ', icon: '🪪', path: '/profile' },
  ],
  parent: [
    { name: 'Tổng Quan', icon: '👁️', path: '/' },
    { name: 'Gia Đình', icon: '👨‍👩‍👧‍👦', path: '/family' },
    { name: 'Nhắn Tin', icon: '💬', path: '/chats' },
    { name: 'Hồ Sơ', icon: '🪪', path: '/profile' },
  ],
};

const ROLE_NAMES = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  parent: 'Phụ huynh',
};

export default function Sidebar({
  role = 'student',
}: {
  role?: 'student' | 'teacher' | 'parent';
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);

  const currentMenu = MENUS[role] || MENUS.student;

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={`${collapsed ? 'w-24' : 'w-64'
        } bg-white border-r-4 border-sky-100 flex flex-col p-4 shadow-xl z-20 transition-all duration-300`}
    >
      {/* Header */}
      <div className="mb-8 mt-2">
        {/* Toggle button ở trên */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-10 h-10 rounded-xl bg-blue-100 hover:bg-blue-200 transition flex items-center justify-center font-bold text-blue-600"
          >
            {collapsed ? '➡️' : '⬅️'}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-3xl animate-bounce">
            🚀
          </span>

          {!collapsed && (
            <>
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                SelfMOOC
              </h1>

              <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Phân quyền: {ROLE_NAMES[role]}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Danh sách Menu */}
      <nav className="flex-1 space-y-3">
        {currentMenu.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center ${collapsed
                  ? 'justify-center'
                  : 'gap-4'
                  } px-4 py-4 rounded-2xl font-bold transition-all transform hover:-translate-y-1 hover:shadow-md ${isActive
                    ? 'bg-blue-400 text-white shadow-[0_4px_0_rgb(37,99,235)]'
                    : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                  }`}
              >
                <span className="text-2xl drop-shadow-sm">
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="text-lg">
                    {item.name}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-4 border-t-4 border-gray-100">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center ${collapsed
            ? 'justify-center'
            : 'justify-center gap-2'
            } px-4 py-4 bg-rose-100 text-rose-600 font-bold rounded-2xl hover:bg-rose-200 hover:-translate-y-1 hover:shadow-[0_4px_0_rgb(225,29,72)] transition-all`}
        >
          <span className="text-xl">🚪</span>

          {!collapsed && 'Thoát ra'}
        </button>
      </div>
    </aside>
  );
}