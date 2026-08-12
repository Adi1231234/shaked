import { useState } from "react";
import * as Icon from "./icons.jsx";
import { showToast } from "../toast.js";
import styles from "./BottomNav.module.css";

const TABS = [
  { Icon: Icon.Home, label: "Home" },
  { Icon: Icon.Search, label: "Search" },
  { Icon: Icon.Library, label: "Your Library" },
  { Icon: Icon.Download, label: "Install App" },
];

// Bottom navigation bar - tapping highlights the active tab
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
