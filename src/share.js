import { showToast } from "./toast.js";

// העתקת הקישור לעמוד ללוח, עם הודעת אישור
export function shareLink() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(
      () => showToast("הקישור הועתק"),
      () => showToast(url),
    );
  } else {
    showToast(url);
  }
}
