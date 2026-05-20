import * as Icon from "./icons.jsx";
import styles from "./BottomNav.module.css";

// סרגל הניווט התחתון
export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      <button className={`${styles.item} ${styles.active}`}>
        <Icon.Home size={24} />
        <span>בית</span>
      </button>
      <button className={styles.item}>
        <Icon.Search size={24} />
        <span>חיפוש</span>
      </button>
      <button className={styles.item}>
        <Icon.Library size={24} />
        <span>הספרייה שלך</span>
      </button>
    </nav>
  );
}
