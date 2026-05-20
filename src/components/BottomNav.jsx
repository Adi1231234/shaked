import { useState } from "react";
import * as Icon from "./icons.jsx";
import { showToast } from "../toast.js";
import styles from "./BottomNav.module.css";

const TABS = [
  { Icon: Icon.Home, label: "מסך הבית" },
  { Icon: Icon.Search, label: "חיפוש" },
  { Icon: Icon.Library, label: "הספרייה שלכם" },
  { Icon: Icon.Download, label: "להורדת היישום" },
];

// סרגל הניווט התחתון - לחיצה מסמנת את הלשונית הפעילה
export default function BottomNav() {
  const [active, setActive] = useState(0);

  return (
    <nav className={styles.nav}>
      {TABS.map((tab, i) => (
        <button
          key={tab.label}
          className={`${styles.item} ${i === active ? styles.active : ""}`}
          onClick={() => {
            setActive(i);
            if (i !== 0) showToast(tab.label);
          }}
        >
          <tab.Icon size={24} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
