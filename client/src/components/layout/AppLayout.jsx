import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useTheme } from '../../context/ThemeContext';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { spatialStyle, isDark } = useTheme();

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Subtle Ambient Spatial Glow Accent for Futuristic and Dark Spatial themes */}
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40 transition-opacity duration-500"
        >
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px]" />
          {spatialStyle === 'futuristic-glass' && (
            <div className="absolute -bottom-20 left-10 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px]" />
          )}
        </div>
      )}

      {/* Spatial Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 z-10 relative">
        <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
