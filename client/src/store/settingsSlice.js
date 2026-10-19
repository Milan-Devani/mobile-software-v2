import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    shop: {
      name: 'Mobotech mobile care',
      phone: '080000 24439',
      email: 'support@mobotech.com',
      address: 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006',
      currency: 'INR',
      currency_symbol: '₹',
      tax_rate: 18,
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
