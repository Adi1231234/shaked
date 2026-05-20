import * as Icon from "./icons.jsx";
import styles from "./BottomNav.module.css";

// סרגל הניווט התחתון - 4 פריטים, לפי המקור
export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      <button className={`${styles.item} ${styles.active}`}>
        <Icon.Home size={24} />
        <span>מסך הבית</span>
      </button>
      <button className={styles.item}>
        <Icon.Search size={24} />
        <span>חיפוש</span>
      </button>
      <button className={styles.item}>
        <Icon.Library size={24} />
        <span>הספרייה שלכם</span>
      </button>
      <button className={styles.item}>
        <Icon.Download size={24} />
        <span>להורדת היישום</span>
      </button>
    </nav>
  );
}
