import { deviceBridgeService } from '../services/deviceBridgeService.js';

/**
 * Controller to handle hardware mobile device detection via USB
 */
export const detectDevice = async (req, res, next) => {
  try {
    const result = await deviceBridgeService.detectConnectedDevice();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
