/**
 * Cross-Platform Universal Clipboard Copy Function
 * Works reliably across:
 * - iOS Safari & Chrome (iPhone, iPod)
 * - iPadOS Safari & Chrome (including MacIntel touch devices)
 * - Android (Chrome, Samsung Internet, WebViews, WhatsApp/Instagram in-app browsers)
 * - Windows, macOS, Linux (all desktop browsers)
 * - Both HTTPS (secure) and HTTP / Local IP LAN contexts
 *
 * @param {string} text - The text to copy to the clipboard
 * @returns {Promise<boolean>} - True if copied successfully, false otherwise
 */
export const copyTextToClipboard = async (text) => {
  if (!text || typeof text !== "string") return false;
  const cleanText = text.trim();
  if (!cleanText) return false;

  let copied = false;

  // 1. Synchronous document.execCommand('copy') during active user gesture.
  // This is the most reliable method for iOS Safari, iPadOS, and WebViews,
  // where async Promises can cause the browser to revoke user-activation permissions.
  try {
    const isIOS =
      /ipad|iphone|ipod/i.test(navigator?.userAgent || "") ||
      (navigator?.platform === "MacIntel" && navigator?.maxTouchPoints > 1);

    const textarea = document.createElement("textarea");
    textarea.value = cleanText;

    // Prevent virtual keyboard from popping up on mobile devices
    textarea.setAttribute("readonly", "");
    textarea.contentEditable = "true";

    // Place off-screen while keeping it part of the layout flow
    // (iOS Safari ignores selection on display:none or visibility:hidden elements)
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.fontSize = "16px"; // Prevents iOS automatic zoom on focus

    // Preserve previous user selection
    const selection = window.getSelection();
    const originalRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    document.body.appendChild(textarea);

    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, 999999);
    } else {
      textarea.focus();
      textarea.select();
    }

    try {
      copied = document.execCommand("copy");
    } catch (_) {
      copied = false;
    } finally {
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
      // Restore previous user selection if any
      if (originalRange && selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        } catch (_) {}
      }
    }
  } catch (_) {
    copied = false;
  }

  // 2. Also invoke modern Navigator Clipboard API if available.
  // In secure contexts (HTTPS) on modern Chrome/Firefox/Safari/Edge, this ensures
  // standard system clipboard write even if execCommand is deprecated or restricted.
  if (navigator?.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(cleanText);
      copied = true;
    } catch (_) {
      // If execCommand already succeeded, copied remains true
    }
  }

  return copied;
};
