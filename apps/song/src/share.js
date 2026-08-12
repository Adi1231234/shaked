import { showToast } from "./toast.js";

// Copy the page link to the clipboard, with a confirmation toast
export function shareLink() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(
      () => showToast("Link copied"),
      () => showToast(url),
    );
  } else {
    showToast(url);
  }
}
