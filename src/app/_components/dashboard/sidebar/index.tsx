"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import type { Section } from "../wrapper/dashboardWrapper";
import { useState } from "react";

interface SidebarProps {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeTab: Section;
  setSection: (section: Section) => void;
}

export default function Sidebar({ isCollapsed, setCollapsed, activeTab, setSection }: SidebarProps) {
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);

  if (!session?.user) return null;

  const { name, email, image } = session.user;
  const avatarContent = image ? (
    <Image
      src={image}
      alt="Profile"
      width={24}
      height={24}
      className="rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
      {name?.charAt(0).toUpperCase() ?? '?'}
    </div>
  );

  return (
    <aside
      className={`h-screen shadow-lg border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-black border-b flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-14" : "w-56"
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        setCollapsed(false);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setCollapsed(true);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Image
            src="/lyra-logo.png"
            alt="Lyra Logo"
            width={24}
            height={24}
            className="rounded"
          />
          {!isCollapsed && <span className="text-sm font-medium">LyraMail</span>}
        </div>
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <svg width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#75777C" strokeWidth="1.2">
              <rect x="1.5" y="2.5" width="15" height="13" rx="3"></rect>
              <path d="M7.8 2.725v12.5"></path>
              <path d="M3.975 5.425h1.35M3.975 7.674h1.35" strokeLinecap="round" strokeLinejoin="round"></path>
            </g>
          </svg>
        </button>
      </div>

      {/* Email Sections */}
      <div className="flex flex-col p-2">
        {!isCollapsed && (
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 mb-2">Emails</h3>
        )}

        {/* Inbox */}
        <button
          onClick={() => setSection("inbox")}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
            activeTab === "inbox" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
        >
          <svg width="14" height="14" fill="none">
            <rect x="1" y="2" width="12" height="10" rx="2.5" stroke="#5C5E63" strokeWidth="1.1" />
            <path d="m3.1 4.6.51.535C5.164 6.765 5.94 7.58 6.925 7.59c.984.01 1.778-.787 3.368-2.382L10.9 4.6" stroke="#5C5E63" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          {!isCollapsed && <span className="text-sm">Inbox</span>}
        </button>

        {/* Starred */}
        <button
          onClick={() => setSection("starred")}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
            activeTab === "starred" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#5C5E63" strokeWidth="1.1" />
          </svg>
          {!isCollapsed && <span className="text-sm">Starred</span>}
        </button>

        {/* Sent */}
        <button
          onClick={() => setSection("sent")}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
            activeTab === "sent" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" stroke="#5C5E63" strokeWidth="1.1" />
          </svg>
          {!isCollapsed && <span className="text-sm">Sent</span>}
        </button>
      </div>

      {/* User Profile Section */}
      <div className="mt-auto border-t border-gray-200 dark:border-gray-700">
        {/* Profile */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} p-3`}>
          {avatarContent}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{email}</span>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => signOut()}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded`}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="#5C5E63" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!isCollapsed && <span className="text-sm">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
