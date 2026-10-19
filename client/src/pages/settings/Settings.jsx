import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Palette,
  Store,
  Bell,
  Users,
  Save,
  Plus,
  QrCode,
  Smartphone,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Check,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Shield,
  Layers,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { settingsService } from '../../services/settingsService';
import { authService } from '../../services/authService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { WhatsAppQrModal } from '../../components/common/WhatsAppQrModal';
import {
  useTheme,
  SPATIAL_STYLES,
  THEME_MODES,
  ANIMATION_PREFERENCES,
} from '../../context/ThemeContext';

export const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'shop' | 'users' | 'notifications'
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({});
  const [notifications, setNotifications] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // User search & filter
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // New user modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('technician');

  // WhatsApp Modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [waStatus, setWaStatus] = useState({ isConnected: false });

  // Theme Context
  const {
    spatialStyle,
    setSpatialStyle,
    themeMode,
    setThemeMode,
    effectiveTheme,
    animations,
    setAnimations,
    resetDefaults,
  } = useTheme();

  const fetchWaStatus = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/whatsapp/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data?.success) {
        setWaStatus(data.data);
      }
    } catch {
      // silent
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsData, usersData] = await Promise.all([
        settingsService.getSettings(),
        authService.getUsers().catch(() => []),
      ]);
      setShop(settingsData.shop || {});
      setNotifications(settingsData.notifications || {});
      setUsersList(usersData || []);
      fetchWaStatus();
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveShopProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await settingsService.updateShopProfile(shop);
      toast.success('Shop profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update shop profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotification = async (channelKey, value) => {
    try {
      const updatedConfig = {
        ...notifications,
        [channelKey]: value,
      };
      setNotifications(updatedConfig);
      await settingsService.updateNotifications({
        email_enabled: channelKey === 'email_enabled' ? value : notifications.email_enabled,
        sms_enabled: channelKey === 'sms_enabled' ? value : notifications.sms_enabled,
        whatsapp_enabled: channelKey === 'whatsapp_enabled' ? value : notifications.whatsapp_enabled,
      });
      toast.success('Notification preference updated.');
    } catch {
      toast.error('Failed to update notification setting');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await authService.createUser({
        full_name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        phone: newUserPhone,
        role_id: newUserRole,
      });
      toast.success(`User "${newUserName}" created successfully!`);
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserRole('technician');
      fetchSettings();
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmResetAppearance = () => {
    Swal.fire({
      title: 'Reset Appearance to Defaults?',
      text: 'This will restore Dark Spatial style, Dark mode, and Full animations.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Reset',
    }).then((result) => {
      if (result.isConfirmed) {
        resetDefaults();
        toast.success('Appearance reset to default settings.');
      }
    });
  };

  // Filter users list
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role_id === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <LoadingSpinner label="Loading workshop settings & spatial preferences..." />;
  }

  // Visual card definitions for the three spatial styles
  const styleCards = [
    {
      id: SPATIAL_STYLES.DARK_SPATIAL,
      name: 'Dark Spatial',
      badge: 'Futuristic & Polished',
      description:
        'Deep charcoal backgrounds, layered floating cards, subtle elevation, and soft cyan accent lighting for a premium SaaS workflow.',
      previewBg: 'bg-[#090d16]',
      previewCard: 'bg-[#0f172a] border border-white/10 shadow-lg',
      previewAccent: 'bg-sky-400',
      previewText: 'text-slate-200',
      previewMuted: 'text-slate-400',
    },
    {
      id: SPATIAL_STYLES.CLEAN_LIGHT,
      name: 'Clean Light',
      badge: 'Minimal & High Contrast',
      description:
        'White and soft-gray layered surfaces with natural elevation, delicate borders, and executive blue accents. Perfect for bright environments.',
      previewBg: 'bg-[#f8fafc]',
      previewCard: 'bg-white border border-slate-200 shadow-sm',
      previewAccent: 'bg-primary-600',
      previewText: 'text-slate-800',
      previewMuted: 'text-slate-500',
    },
    {
      id: SPATIAL_STYLES.FUTURISTIC_GLASS,
      name: 'Futuristic Glass',
      badge: 'Frosted Translucent',
      description:
        'Layered frosted-glass panels, depth-aware shadows, ambient holographic cyan & violet edge glows, and strict readability.',
      previewBg: 'bg-[#050814]',
      previewCard: 'bg-slate-900/60 backdrop-blur-md border border-cyan-400/30 shadow-cyan-950/40 shadow-xl',
      previewAccent: 'bg-gradient-to-r from-cyan-400 to-purple-400',
      previewText: 'text-white',
      previewMuted: 'text-cyan-200/70',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight">
            Workshop & System Settings
          </h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Customize spatial appearance, business profile, technician team access, and multi-channel notification dispatchers
          </p>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'appearance'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-950/20'
              : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance & Spatial UI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'shop'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-950/20'
              : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'users'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-950/20'
              : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Users ({usersList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'notifications'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-950/20'
              : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications & WhatsApp</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: APPEARANCE & SPATIAL UI                                       */}
      {/* ==================================================================== */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Style Selector Section */}
          <Card
            title="Spatial UI Design Styles"
            subtitle="Choose between three crafted spatial computing themes. Applied immediately without page reload."
            action={
              <button
                type="button"
                onClick={handleConfirmResetAppearance}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] transition-colors active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {styleCards.map((sc) => {
                const isSelected = spatialStyle === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => {
                      setSpatialStyle(sc.id);
                      toast.success(`Applied ${sc.name} style!`);
                    }}
                    className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between border ${
                      isSelected
                        ? 'border-sky-400 bg-[var(--spatial-bg-card-subtle)] ring-2 ring-sky-500/30 shadow-lg shadow-sky-950/20'
                        : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card)] hover:border-[var(--spatial-border-hover)] hover:-translate-y-1'
                    }`}
                  >
                    {/* Active Checkmark Pill */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold shadow-sm">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    )}

                    <div>
                      {/* Mini Preview Box */}
                      <div
                        className={`w-full h-28 rounded-xl p-3 mb-3 relative overflow-hidden flex flex-col justify-between ${sc.previewBg}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-2 rounded-full bg-slate-500/30" />
                          <div className={`w-3 h-3 rounded-full ${sc.previewAccent}`} />
                        </div>
                        <div className={`p-2 rounded-lg ${sc.previewCard} flex items-center justify-between`}>
                          <div className="space-y-1">
                            <div className="w-16 h-2 rounded bg-slate-400/30" />
                            <div className="w-10 h-1.5 rounded bg-slate-400/20" />
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${sc.previewAccent} text-white`}>
                            ₹1,450
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[var(--spatial-text-title)]">{sc.name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-400/20">
                          {sc.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--spatial-text-muted)] mt-1.5 leading-relaxed">
                        {sc.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--spatial-border)] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[var(--spatial-text-muted)]">
                        {isSelected ? 'Currently Applied' : 'Click to Apply'}
                      </span>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white font-bold'
                            : 'border border-[var(--spatial-border)] text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                        }`}
                      >
                        {isSelected ? 'Applied' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Theme Mode & Animation Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Color Mode Selector */}
            <Card title="Color Mode System" subtitle="Independent from design style">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { mode: THEME_MODES.LIGHT, label: 'Light', icon: Sun, desc: 'Daylight clarity' },
                  { mode: THEME_MODES.DARK, label: 'Dark', icon: Moon, desc: 'Low eye strain' },
                  { mode: THEME_MODES.SYSTEM, label: 'System', icon: Laptop, desc: 'Follows OS' },
                ].map(({ mode, label, icon: Icon, desc }) => {
                  const isSelected = themeMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setThemeMode(mode);
                        toast.success(`Color mode switched to ${label}!`);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500/15 text-sky-400 ring-2 ring-sky-500/20'
                          : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] hover:border-[var(--spatial-border-hover)]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-bold">{label}</span>
                      <span className="text-[10px] text-[var(--spatial-text-muted)] leading-tight">{desc}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--spatial-text-muted)] mt-3">
                Effective Theme: <strong className="text-[var(--spatial-text-title)] uppercase font-mono">{effectiveTheme}</strong>
              </p>
            </Card>

            {/* Animation Preference */}
            <Card title="Motion & Micro-Interactions" subtitle="Control spring transitions & GPU effects">
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    pref: ANIMATION_PREFERENCES.FULL,
                    label: 'Full Animations',
                    icon: Sparkles,
                    desc: 'Smooth hover lifts, tactile button springs, modal transitions',
                  },
                  {
                    pref: ANIMATION_PREFERENCES.REDUCED,
                    label: 'Reduced Motion',
                    icon: Sliders,
                    desc: 'Instant transitions, minimal transforms for accessibility',
                  },
                ].map(({ pref, label, icon: Icon, desc }) => {
                  const isSelected = animations === pref;
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        setAnimations(pref);
                        toast.success(`${label} preference applied!`);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500/15 text-sky-400 ring-2 ring-sky-500/20'
                          : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] hover:border-[var(--spatial-border-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="w-4 h-4" />
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                      <span className="text-xs font-bold text-[var(--spatial-text-title)]">{label}</span>
                      <span className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5 leading-snug">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SHOP PROFILE                                                  */}
      {/* ==================================================================== */}
      {activeTab === 'shop' && (
        <Card
          title="Shop Profile & Business Details"
          subtitle="Printed on Job Sheets, Invoices, and sent in delivery notifications"
        >
          <form onSubmit={handleSaveShopProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Shop Name *
                </label>
                <input
                  type="text"
                  required
                  value={shop.name || ''}
                  onChange={(e) => setShop({ ...shop, name: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Tagline / Slogan
                </label>
                <input
                  type="text"
                  value={shop.tagline || ''}
                  onChange={(e) => setShop({ ...shop, tagline: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Business Phone *
                </label>
                <input
                  type="text"
                  required
                  value={shop.phone || ''}
                  onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Support Email *
                </label>
                <input
                  type="email"
                  required
                  value={shop.email || ''}
                  onChange={(e) => setShop({ ...shop, email: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Shop Physical Address *
                </label>
                <input
                  type="text"
                  required
                  value={shop.address || ''}
                  onChange={(e) => setShop({ ...shop, address: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Tax / VAT / GST Number
                </label>
                <input
                  type="text"
                  value={shop.tax_number || ''}
                  onChange={(e) => setShop({ ...shop, tax_number: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={shop.currency_symbol || '₹'}
                  onChange={(e) => setShop({ ...shop, currency_symbol: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Standard Warranty Policy (Printed on Invoices & Job Sheets)
                </label>
                <textarea
                  rows={2}
                  value={shop.warranty_terms || ''}
                  onChange={(e) => setShop({ ...shop, warranty_terms: e.target.value })}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--spatial-border)]">
              <Button type="submit" size="sm" icon={Save} loading={isSaving}>
                Save Shop Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: STAFF & TEAM USERS ("Add user on shop setting page")           */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <Card
            title={`Shop Staff & Technician Accounts (${usersList.length})`}
            subtitle="Manage login credentials and authorization roles for technicians, front desk staff, and shop managers"
            action={
              user?.role_id === 'admin' ? (
                <Button size="sm" icon={Plus} onClick={() => setIsAddUserOpen(true)}>
                  Add New Staff
                </Button>
              ) : null
            }
          >
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 spatial-input rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 spatial-input rounded-xl text-xs font-medium"
                >
                  <option value="ALL">All Roles ({usersList.length})</option>
                  <option value="admin">Admins</option>
                  <option value="technician">Technicians</option>
                  <option value="staff">Front Desk Staff</option>
                </select>

                {user?.role_id === 'admin' && (
                  <Button size="sm" icon={Plus} onClick={() => setIsAddUserOpen(true)} className="sm:hidden">
                    Add
                  </Button>
                )}
              </div>
            </div>

            {/* Responsive User Display: Cards on mobile, Sleek Table on Desktop */}
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No staff members found"
                description="Create accounts for technicians and front desk employees to let them manage repairs."
                actionLabel={user?.role_id === 'admin' ? 'Add First Staff Member' : null}
                onAction={() => setIsAddUserOpen(true)}
              />
            ) : (
              <>
                {/* 1. Mobile Cards (< 768px) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 font-bold text-xs uppercase">
                            {u.full_name ? u.full_name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[var(--spatial-text-title)]">{u.full_name}</p>
                            <Badge status={u.role_id} size="sm" />
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">
                          Active
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[var(--spatial-border)] space-y-1 text-xs text-[var(--spatial-text-muted)]">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate font-mono">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono">{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--spatial-border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="px-5 py-3">Team Member</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Email Address</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--spatial-border)]">
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 font-bold text-xs uppercase shrink-0">
                                {u.full_name ? u.full_name.charAt(0) : 'U'}
                              </div>
                              <span className="font-bold text-[var(--spatial-text-title)]">{u.full_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge status={u.role_id} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[var(--spatial-text-body)]">
                            {u.email}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[var(--spatial-text-muted)]">
                            {u.phone || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: NOTIFICATIONS & WHATSAPP                                      */}
      {/* ==================================================================== */}
      {activeTab === 'notifications' && (
        <Card
          title="Notification Dispatchers"
          subtitle="Customer notification pipelines (Brevo Email, Baileys WhatsApp, MSG91 SMS)"
        >
          <div className="space-y-4 text-xs">
            {/* Baileys WhatsApp Linked Device */}
            <div className="p-4 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[var(--spatial-text-title)] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    WhatsApp: Linked Device (Baileys QR Scanner)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      waStatus?.isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-400/30'
                    }`}
                  >
                    {waStatus?.isConnected
                      ? `Linked: +${waStatus.user?.phone || '8758152507'}`
                      : 'Not Linked (Click to Scan QR)'}
                  </span>
                </div>
                <p className="text-[var(--spatial-text-muted)] text-xs mt-1">
                  100% Free (₹0) • Auto-sends delivery invoices & vector PDFs in background directly from your linked device without opening WhatsApp Web.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowWaModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${
                    waStatus?.isConnected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25'
                      : 'spatial-btn-primary'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{waStatus?.isConnected ? 'Manage WhatsApp' : 'Scan QR Code'}</span>
                </button>

                <label className="flex items-center gap-1.5 cursor-pointer border-l border-[var(--spatial-border)] pl-3">
                  <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)]">Enabled</span>
                  <input
                    type="checkbox"
                    checked={notifications.whatsapp_enabled}
                    onChange={(e) => handleToggleNotification('whatsapp_enabled', e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Brevo Email */}
            <div className="p-3.5 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--spatial-text-title)]">Email: Brevo (Sendinblue)</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      notifications.brevo_configured
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {notifications.brevo_configured ? 'Live API Configured' : 'Dev Simulator Mode'}
                  </span>
                </div>
                <p className="text-[var(--spatial-text-muted)] text-[11px] mt-0.5">
                  Sender: {notifications.brevo_sender || 'notifications@mobotech.com'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)]">Enabled</span>
                <input
                  type="checkbox"
                  checked={notifications.email_enabled}
                  onChange={(e) => handleToggleNotification('email_enabled', e.target.checked)}
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </label>
            </div>

            {/* MSG91 SMS */}
            <div className="p-3.5 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--spatial-text-title)]">SMS: MSG91 Free Trial / Flow</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      notifications.msg91_configured
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {notifications.msg91_configured ? 'Live API Configured' : 'Dev Simulator Mode'}
                  </span>
                </div>
                <p className="text-[var(--spatial-text-muted)] text-[11px] mt-0.5">
                  Sender ID: {notifications.msg91_sender || 'TCHFIX'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)]">Enabled</span>
                <input
                  type="checkbox"
                  checked={notifications.sms_enabled}
                  onChange={(e) => handleToggleNotification('sms_enabled', e.target.checked)}
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD NEW SHOP STAFF ACCOUNT                                    */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Add Shop Staff / Technician Account"
        subtitle="Create login account for an employee or technician"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rachel Green"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Email Address (Login) *
              </label>
              <input
                type="email"
                required
                placeholder="rachel@mobotech.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Role Permission *
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-medium"
            >
              <option value="technician">Technician (Diagnosis, Parts, Repairs, QC Testing)</option>
              <option value="staff">Staff / Reception (Customer Check-in, Job Sheets, Pickup, Payments)</option>
              <option value="admin">Admin / Shop Owner (Full System Access)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--spatial-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSaving}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Linked Device Modal */}
      <WhatsAppQrModal
        isOpen={showWaModal}
        onClose={() => {
          setShowWaModal(false);
          fetchWaStatus();
        }}
        onConnected={(waUser) => {
          setWaStatus({ isConnected: true, user: waUser });
          setShowWaModal(false);
          toast.success(`WhatsApp linked as +${waUser?.phone || 'your number'}!`);
        }}
      />
    </div>
  );
};
