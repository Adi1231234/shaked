import { useState } from "react";
import { load, save } from "../store.js";
import styles from "./WelcomeDialog.module.css";

// דיאלוג ברכה שמופיע רק בכניסה הראשונה למערכת (נשמר ב-localStorage)
export default function WelcomeDialog() {
  const [show, setShow] = useState(() => load("welcomed", false) !== true);

  if (!show) return null;

  const dismiss = () => {
    save("welcomed", true);
    setShow(false);
  };

  return (
    <div className={styles.backdrop} onClick={dismiss}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.bigHeart}>❤️</div>
        <div className={styles.message}>
          <span>בהצלחה יפה שלי! ❤️</span>
          <span>את הכי טובה בעולם!!</span>
          <span>אני אוהב אותך</span>
        </div>
        <button className={styles.btn} onClick={dismiss} aria-label="תודה">
          ❤️
        </button>
      </div>
    </div>
  );
}
