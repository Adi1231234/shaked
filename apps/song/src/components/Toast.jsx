import { useEffect, useState } from "react";
import { onToast } from "../toast.js";
import styles from "./Toast.module.css";

// הטוסט הצף - מאזין ל-showToast ומציג הודעה קצרה
export default function Toast() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let timer;
    const off = onToast((message) => {
      setMsg(message);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2200);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  return <div className={styles.toast}>{msg}</div>;
}
