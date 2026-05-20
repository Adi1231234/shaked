import * as Icon from "./icons.jsx";
import { fmt } from "../format.js";
import { shareLink } from "../share.js";
import { showToast } from "../toast.js";
import CoverCarousel from "./CoverCarousel.jsx";
import styles from "./PlayerScreen.module.css";

// מסך הנגן - פיקסל-פרפקט מול Spotify, עם כל הכפתורים פעילים
export default function PlayerScreen({ player, playlistName, onClose }) {
  const { song, playing, current, duration, shuffle, repeat, liked } = player;
  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className={styles.player} style={{ "--accent": song.accent }}>
      <div className={styles.top}>
        <button className={styles.iconBtn} onClick={onClose} aria-label="סגור">
          <Icon.ChevronDown size={24} />
        </button>
        <div className={styles.headerTitle}>{playlistName}</div>
        <button className={styles.iconBtn} onClick={shareLink} aria-label="עוד">
          <Icon.More size={24} />
        </button>
      </div>

      <div className={styles.artWrap}>
        <CoverCarousel song={song} dir={player.dir} />
      </div>

      <div className={styles.metaRow}>
        <div className={styles.titles}>
          <div className={styles.songTitle}>{song.title}</div>
          <div className={styles.songArtist}>{song.artist}</div>
        </div>
        <button
          className={`${styles.heart} ${liked ? styles.on : ""}`}
          onClick={player.toggleLike}
          aria-label="אהבתי"
        >
          {liked ? <Icon.HeartFill size={24} /> : <Icon.Heart size={24} />}
        </button>
      </div>

      <div className={styles.seekRow}>
        <input
          className={styles.seek}
          type="range"
          min={0}
          max={duration || 0}
          value={current}
          step="0.1"
          onChange={(e) => player.seek(Number(e.target.value))}
          style={{ "--pct": `${pct}%` }}
        />
        <div className={styles.times}>
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles.ctlBtn} ${styles.smallBtn} ${shuffle ? styles.on : ""}`}
          onClick={player.toggleShuffle}
          aria-label="ערבוב"
        >
          <Icon.Shuffle size={24} />
        </button>
        <button
          className={`${styles.ctlBtn} ${styles.skipBtn}`}
          onClick={player.prev}
          aria-label="הקודם"
        >
          <Icon.Prev size={32} />
        </button>
        <button className={styles.bigPlay} onClick={player.toggle} aria-label="נגן">
          <span className={styles.bigPlayCircle}>
            {playing ? <Icon.Pause size={24} /> : <Icon.Play size={24} />}
          </span>
        </button>
        <button
          className={`${styles.ctlBtn} ${styles.skipBtn}`}
          onClick={player.next}
          aria-label="הבא"
        >
          <Icon.Next size={32} />
        </button>
        <button
          className={`${styles.ctlBtn} ${styles.smallBtn} ${repeat !== "off" ? styles.on : ""}`}
          onClick={player.cycleRepeat}
          aria-label="חזרה על שיר"
        >
          <Icon.Repeat size={24} />
        </button>
      </div>

      <div className={styles.footer}>
        <button className={styles.footBtn} onClick={shareLink} aria-label="שיתוף">
          <Icon.Share size={16} />
        </button>
        <button
          className={`${styles.footBtn} ${styles.connectBtn}`}
          onClick={() => showToast("מנגן במכשיר הזה")}
          aria-label="מכשירים"
        >
          <Icon.Device size={16} />
        </button>
      </div>
    </div>
  );
}
