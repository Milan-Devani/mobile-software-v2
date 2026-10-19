/**
 * 12 Standard Inward Checklist Items matching Mobotech Service Order / Invoice Checklist Table
 */
export const INWARD_CHECKLIST_CONFIG = [
  { key: 'powers_on', label: 'Device is Powering On', type: 'working', defaultVal: 'Yes' },
  { key: 'power_button', label: 'Power Button is Working', type: 'working', defaultVal: 'Yes' },
  { key: 'volume_buttons', label: 'Volume Keys are Working', type: 'working', defaultVal: 'Yes' },
  { key: 'screen', label: 'Display is Working', type: 'working', defaultVal: 'Yes' },
  { key: 'touch', label: 'Touchscreen is Working', type: 'working', defaultVal: 'Yes' },
  { key: 'speaker', label: 'Speaker is Working', type: 'working', defaultVal: 'Yes' },
  { key: 'charging_port', label: 'Charging Port is Working', type: 'working', defaultVal: 'Yes' },
  { key: 'headphone_jack', label: 'Headphone Jack is Working', type: 'working', defaultVal: 'Yes' },
  { key: 'back_glass', label: 'Back Cover Damaged or Broken', type: 'damage', defaultVal: 'No' },
  { key: 'dents', label: 'Body is Damaged or has Dents', type: 'damage', defaultVal: 'No' },
  { key: 'screw_missing', label: 'Screw Heads are Damaged or Missing', type: 'damage', defaultVal: 'No' },
  { key: 'sim_tray_missing', label: 'SIM Tray is Damaged or Missing', type: 'damage', defaultVal: 'No' },
];

/**
 * Resolves Yes/No for each checklist item across new dynamic checklist data
 * and legacy database structures without breaking older jobs.
 */
export const resolveChecklistValue = (key, cond = {}) => {
  if (!cond) return 'No';

  // 1. Direct checklist object or direct key with explicit 'Yes' / 'No'
  const rawVal = cond.checklist?.[key] !== undefined ? cond.checklist[key] : cond[key];

  if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim().toLowerCase();
    if (trimmed === 'yes') return 'Yes';
    if (trimmed === 'no') return 'No';
  }

  if (rawVal === true) return 'Yes';
  if (rawVal === false) return 'No';

  // 2. Backward compatibility with legacy schema values
  switch (key) {
    case 'powers_on':
      return cond.powers_on === false ? 'No' : (cond.powers_on || cond.power_on) ? 'Yes' : 'No';

    case 'power_button':
      return cond.power_button === 'Faulty' ? 'No' : cond.power_button === 'Working' ? 'Yes' : 'No';

    case 'volume_buttons':
      return cond.volume_buttons === 'Faulty' ? 'No' : cond.volume_buttons === 'Working' ? 'Yes' : 'No';

    case 'screen':
      if (cond.screen === 'Broken' || cond.screen === 'Blank' || cond.screen === 'Completely black / No display' || cond.screen_cracked) {
        return 'No';
      }
      if (cond.screen === 'Working' || cond.screen === 'Intact / No cracks' || cond.screen === true || cond.screen === 'Yes') {
        return 'Yes';
      }
      return 'No';

    case 'touch':
      if (cond.touch === 'Faulty' || cond.screen === 'Unresponsive touch') return 'No';
      if (cond.touch === 'Working' || cond.touch === true) return 'Yes';
      return 'No';

    case 'speaker':
      return cond.speaker === 'Faulty' ? 'No' : cond.speaker === 'Working' ? 'Yes' : 'No';

    case 'charging_port':
      if (cond.charging_port === 'Faulty' || cond.charging_port === 'Damaged / Burn marks' || cond.charging_port === 'Loose connection') {
        return 'No';
      }
      if (cond.charging_port === 'Working' || cond.charging_port === 'Functional' || cond.charging_port === true) {
        return 'Yes';
      }
      return 'No';

    case 'headphone_jack':
      return cond.headphone_jack === 'Faulty' ? 'No' : cond.headphone_jack === 'Working' ? 'Yes' : 'No';

    case 'back_glass':
      if (cond.back_glass === 'Cracked' || cond.back_glass === true || cond.body === 'Dent' || cond.body === 'Back glass shattered') {
        return 'Yes';
      }
      return 'No';

    case 'dents':
      return cond.dents || cond.body === 'Dented corners' ? 'Yes' : 'No';

    case 'screw_missing':
      return cond.screw_missing ? 'Yes' : 'No';

    case 'sim_tray_missing':
      return cond.sim_tray_missing ? 'Yes' : 'No';

    default:
      return Boolean(rawVal) ? 'Yes' : 'No';
  }
};
