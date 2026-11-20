/**
 * Reference-counted page scroll lock shared by Modal and SpatialDrawer.
 *
 * Several overlays can be open at once (e.g. a confirm modal over a drawer). Each one
 * calls lockBodyScroll() when it opens and unlockBodyScroll() when it closes; the page
 * only becomes scrollable again when the last overlay has closed.
 */
let lockCount = 0;

export const lockBodyScroll = () => {
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }
};

export const unlockBodyScroll = () => {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = 'unset';
    document.body.classList.remove('modal-open');
  }
};
