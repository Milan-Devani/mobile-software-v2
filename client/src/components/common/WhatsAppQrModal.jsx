import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, RefreshCw, Smartphone, LogOut, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const WhatsAppQrModal = ({ isOpen, onClose, onConnected }) => {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/whatsapp/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data?.success) {
        setStatusData(data.data);
        if (data.data.isConnected && onConnected) {
          onConnected(data.data.user);
        }
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchStatus();
    // Poll every 2.5 seconds to detect when user scans the QR code on their phone
    const timer = setInterval(fetchStatus, 2500);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleReconnect = async () => {
    setIsRefreshing(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      await fetch(`${apiBase}/whatsapp/connect`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success('Regenerating QR code...');
      await fetchStatus();
    } catch (err) {
      toast.error('Failed to regenerate QR code');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to unlink your WhatsApp device?')) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      await fetch(`${apiBase}/whatsapp/disconnect`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success('WhatsApp session disconnected');
      await fetchStatus();
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base leading-tight">Link Your WhatsApp</h3>
              <p className="text-xs text-emerald-100">Send invoices automatically from your phone number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-3" />
              <p className="text-sm font-medium">Checking WhatsApp connection...</p>
            </div>
          ) : statusData?.isConnected ? (
            /* CONNECTED STATE */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">WhatsApp is Connected!</h4>
              <p className="text-xs text-slate-600 mt-1">
                Linked as: <strong className="text-black font-mono font-bold text-sm">+{statusData.user?.phone || '8758152507'}</strong>
              </p>
              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 text-left">
                ✅ When you click <strong>"WhatsApp"</strong> on any invoice, it will now send <strong>automatically in the background</strong> with the attached PDF without opening browser tabs!
              </div>

              <div className="mt-6 flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
                >
                  Done
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Unlink Device</span>
                </button>
              </div>
            </div>
          ) : (
            /* QR CODE SCAN STATE */
            <div>
              <div className="flex flex-col items-center">
                {statusData?.qrDataUrl ? (
                  <div className="p-3 bg-white border-2 border-dashed border-emerald-500 rounded-2xl shadow-sm relative group">
                    <img
                      src={statusData.qrDataUrl}
                      alt="Scan WhatsApp QR"
                      className="w-56 h-56 block object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <span className="text-xs">Generating QR code...</span>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Waiting for QR scan...
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-600">
                <p className="font-bold text-slate-800">How to scan with your phone:</p>
                <ol className="list-decimal list-outside ml-4 space-y-1">
                  <li>Open <strong>WhatsApp</strong> on your phone.</li>
                  <li>Tap <strong>Settings</strong> (or 3 dots menu) $\to$ <strong>Linked Devices</strong>.</li>
                  <li>Tap <strong>Link a Device</strong> and point your camera at the QR code above.</li>
                </ol>
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg font-medium mt-2">
                  🔒 <em>Your personal chats and WhatsApp app stay 100% active on your phone. Nothing is deleted!</em>
                </p>
              </div>

              {/* Footer controls */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  onClick={handleReconnect}
                  disabled={isRefreshing}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh QR</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default WhatsAppQrModal;
