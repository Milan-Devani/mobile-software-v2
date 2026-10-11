import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu,
  Search,
  Plus,
  Shield,
  User,
  Wrench,
  Smartphone
} from 'lucide-react';
import { setSearchQuery } from '../../store/jobSlice';

export const Topbar = ({ onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      dispatch(setSearchQuery(searchInput.trim()));
      navigate(`/jobs?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Job #, Customer, Phone, IMEI..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </form>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/jobs/new')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Repair Job</span>
          <span className="sm:hidden">New</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">{user?.role_id}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 font-bold text-xs uppercase shadow-sm">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};
