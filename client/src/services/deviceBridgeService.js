import api from './api';

export const deviceBridgeService = {
  /**
   * Triggers hardware mobile device USB auto-detection across iOS and Android
   */
  async detectDevice() {
    return await api.get('/device-bridge/detect');
  },
};

export default deviceBridgeService;
