import Swal from 'sweetalert2';

/**
 * Centralised, theme-aware dialog helpers.
 *
 * WHY THIS EXISTS
 *   The app previously used native window.confirm() / alert(), which look
 *   nothing like the Spatial UI and cannot be styled. All confirmations and
 *   alerts should go through here instead.
 *
 * The dialog inherits the active theme because the styles in `swal-theme.css`
 * read the same `--spatial-*` CSS variables the rest of the app uses.
 */

const BASE = {
  background: 'var(--spatial-bg-card)',
  color: 'var(--spatial-text-body)',
  confirmButtonColor: '#0071e3', // Apple blue — matches .spatial-btn-primary
  cancelButtonColor: '#64748b',
  reverseButtons: true,
  focusCancel: true,
  buttonsStyling: true,
  customClass: {
    popup: 'spatial-swal-popup',
    title: 'spatial-swal-title',
    htmlContainer: 'spatial-swal-text',
    confirmButton: 'spatial-swal-confirm',
    cancelButton: 'spatial-swal-cancel',
    icon: 'spatial-swal-icon',
  },
};

/**
 * Themed replacement for window.confirm().
 * @returns {Promise<boolean>} true when the user confirms
 */
export const confirmDialog = async ({
  title = 'Are you sure?',
  text = '',
  confirmText = 'Yes, continue',
  cancelText = 'Cancel',
  icon = 'question',
  danger = false,
  confirmButtonColor,
} = {}) => {
  const result = await Swal.fire({
    ...BASE,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmButtonColor || (danger ? '#ef4444' : '#0071e3'),
  });
  return Boolean(result.isConfirmed);
};

/**
 * Themed replacement for window.alert().
 */
export const alertDialog = async ({
  title = 'Notice',
  text = '',
  icon = 'info',
  confirmText = 'OK',
} = {}) => {
  await Swal.fire({
    ...BASE,
    title,
    text,
    icon,
    confirmButtonText: confirmText,
    showCancelButton: false,
  });
};

/**
 * Themed success toast-dialog (non-blocking alternative is `toast.success`).
 */
export const successDialog = async ({ title = 'Done', text = '' } = {}) =>
  alertDialog({ title, text, icon: 'success', confirmText: 'OK' });

/**
 * Themed error dialog.
 */
export const errorDialog = async ({ title = 'Something went wrong', text = '' } = {}) =>
  alertDialog({ title, text, icon: 'error', confirmText: 'Close' });

export default { confirmDialog, alertDialog, successDialog, errorDialog };
