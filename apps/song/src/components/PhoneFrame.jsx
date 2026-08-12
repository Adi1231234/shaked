import styles from "./PhoneFrame.module.css";

// מסגרת טלפון לתצוגה בדסקטופ. במסך צר (טלפון אמיתי) המסגרת נעלמת.
export default function PhoneFrame({ children }) {
  return (
    <div className={styles.stage}>
      <div className={styles.phone}>
        <div className={styles.notch} />
        <div className={styles.screen}>{children}</div>
      </div>
    </div>
  );
}
