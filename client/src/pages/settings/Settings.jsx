import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Settings as SettingsIcon,
  Store,
  Bell,
  FileText,
  ShieldCheck,
  Users,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';
import { authService } from '../../services/authService';
import { Card, LoadingSpinner } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({});
  const [notifications, setNotifications] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // New user modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('technician');

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
    } catch (err) {
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
    } catch (err) {
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
        role_id: newUserRole,
      });
      toast.success(`User "${newUserName}" created!`);
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchSettings();
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading workshop settings..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Settings & Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">
          Customize shop information, invoice parameters, warranty guarantees, and team access
        </p>
      </div>

      {/* 1. Shop Profile Card */}
      <Card title="Shop Profile & Business Details" subtitle="Printed on Job Sheets, Invoices, and sent to customers">
        <form onSubmit={handleSaveShopProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={shop.name || ''}
                onChange={(e) => setShop({ ...shop, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={shop.tagline || ''}
                onChange={(e) => setShop({ ...shop, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Business Phone *
              </label>
              <input
                type="text"
                required
                value={shop.phone || ''}
                onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Support Email *
              </label>
              <input
                type="email"
                required
                value={shop.email || ''}
                onChange={(e) => setShop({ ...shop, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Shop Physical Address *
              </label>
              <input
                type="text"
                required
                value={shop.address || ''}
                onChange={(e) => setShop({ ...shop, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Tax / VAT / GST Number
              </label>
              <input
                type="text"
                value={shop.tax_number || ''}
                onChange={(e) => setShop({ ...shop, tax_number: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={shop.currency_symbol || '$'}
                onChange={(e) => setShop({ ...shop, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Standard Warranty Policy (Printed on Invoices)
              </label>
              <textarea
                rows={2}
                value={shop.warranty_terms || ''}
                onChange={(e) => setShop({ ...shop, warranty_terms: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" size="sm" icon={Save} loading={isSaving}>
              Save Shop Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Notification Provider Integrations Status */}
      <Card title="Notification Service Providers" subtitle="Configured through secure environment variables (Brevo, OpenWA, MSG91)">
        <div className="space-y-4 text-xs">
          {/* Brevo Email */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Email: Brevo (Sendinblue)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  notifications.brevo_configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {notifications.brevo_configured ? 'Live API Configured' : 'Dev Simulator Mode'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">Sender: {notifications.brevo_sender || 'notifications@techfixpro.com'}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-semibold text-slate-600">Enabled</span>
              <input
                type="checkbox"
                checked={notifications.email_enabled}
                onChange={(e) => handleToggleNotification('email_enabled', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
          </div>

          {/* OpenWA WhatsApp */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">WhatsApp: OpenWA Gateway</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  notifications.openwa_configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {notifications.openwa_configured ? 'Gateway Connected' : 'Dev Simulator Mode'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">Gateway URL: {notifications.openwa_url}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-semibold text-slate-600">Enabled</span>
              <input
                type="checkbox"
                checked={notifications.whatsapp_enabled}
                onChange={(e) => handleToggleNotification('whatsapp_enabled', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
          </div>

          {/* MSG91 SMS */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">SMS: MSG91 Free Trial / Flow</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  notifications.msg91_configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {notifications.msg91_configured ? 'Live API Configured' : 'Dev Simulator Mode'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">Sender ID: {notifications.msg91_sender || 'TCHFIX'}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-semibold text-slate-600">Enabled</span>
              <input
                type="checkbox"
                checked={notifications.sms_enabled}
                onChange={(e) => handleToggleNotification('sms_enabled', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* 3. User Accounts (Admin Only) */}
      {user?.role_id === 'admin' && (
        <Card
          title={`Shop Staff Accounts (${usersList.length})`}
          subtitle="Manage authentication roles (Admin, Technician, Staff)"
          action={
            <Button size="sm" icon={Plus} onClick={() => setIsAddUserOpen(true)}>
              Add User
            </Button>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role_id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Add Shop Staff Account"
        subtitle="Create login account for employee"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rachel Green"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="rachel@fixitrepair.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Role Permission *
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="technician">Technician (Diagnosis, Parts, Repairs, QC Testing)</option>
              <option value="staff">Staff / Reception (Customer Check-in, Job Sheets, Pickup, Payments)</option>
              <option value="admin">Admin / Shop Owner (Full Access)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSaving}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
