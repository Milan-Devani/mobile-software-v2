import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useTheme } from '../../context/ThemeContext';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { spatialStyle, isDark } = useTheme();

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-[#0071e3] selection:text-white">
      {/* Subtle Apple Ambient Vignette Depth */}
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25 transition-opacity duration-500 print:hidden"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/10 rounded-full blur-[140px]" />
        </div>
      )}

      {/* Spatial Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 z-10 relative print:pl-0">
        <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-[1680px] w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
