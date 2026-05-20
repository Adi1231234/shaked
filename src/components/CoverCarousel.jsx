import { useLayoutEffect, useRef, useState } from "react";
import styles from "./CoverCarousel.module.css";

// קרוסלת עטיפות - מחליקה הצידה בכל מעבר שיר.
// תמיד מחליקה לכיוון של הכפתור שנלחץ (גם במעבר מהשיר האחרון לראשון).
export default function CoverCarousel({ song, dir }) {
  const [anim, setAnim] = useState(null);
  const prevSong = useRef(song);
  const nonce = useRef(0);

  useLayoutEffect(() => {
    if (prevSong.current !== song) {
      nonce.current += 1;
      setAnim({ out: prevSong.current, in: song, prev: dir < 0, id: nonce.current });
      prevSong.current = song;
    }
  }, [song, dir]);

  // סדר העטיפות במסילה: ב"הבא" המסילה מחליקה שמאלה, ב"הקודם" ימינה
  const covers = anim
    ? anim.prev
      ? [anim.in, anim.out]
      : [anim.out, anim.in]
    : [song];

  return (
    <div className={styles.viewport}>
      <div
        key={anim ? anim.id : "static"}
        className={`${styles.track} ${anim ? (anim.prev ? styles.prev : styles.next) : ""}`}
        onAnimationEnd={() => setAnim(null)}
      >
        {covers.map((s, i) => (
          <img key={i} className={styles.cover} src={s.cover} alt={s.title || ""} />
        ))}
      </div>
    </div>
  );
}
