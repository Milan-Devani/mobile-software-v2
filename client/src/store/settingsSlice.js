import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    shop: {
      name: 'TechFix Pro Repairs',
      phone: '+1 (555) 789-0123',
      email: 'support@techfixpro.com',
      address: '742 Evergreen Terrace, Suite 12',
      currency: 'USD',
      currency_symbol: '$',
      tax_rate: 8.25,
      warranty_days: 90,
    },
    notifications: {
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
    },
  },
  reducers: {
    setShopProfile: (state, action) => {
      state.shop = { ...state.shop, ...action.payload };
    },
    setNotificationSettings: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
  },
});

export const { setShopProfile, setNotificationSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
