import * as Icon from "./icons.jsx";
import { fmt } from "../format.js";
import styles from "./PlayerScreen.module.css";

// מסך הנגן המלא - מבנה זהה ל-now-playing view של Spotify (נשאב מהטאב)
export default function PlayerScreen({ song, audio, onPlay, onClose }) {
  const pct = audio.duration ? (audio.current / audio.duration) * 100 : 0;

  return (
    <div className={styles.player} style={{ "--accent": song.accent }}>
      <div className={styles.top}>
        <button className={styles.iconBtn} onClick={onClose} aria-label="סגור">
          <Icon.ChevronDown size={26} />
        </button>
        <div className={styles.headerTitle}>{song.playlistName}</div>
        <button className={styles.iconBtn} aria-label="עוד">
          <Icon.More size={22} />
        </button>
      </div>

      <div className={styles.artWrap}>
        <img className={styles.art} src={song.cover} alt={song.title} />
      </div>

      <div className={styles.metaRow}>
        <div className={styles.titles}>
          <div className={styles.songTitle}>{song.title}</div>
          <div className={styles.songArtist}>{song.artist}</div>
        </div>
        <button className={styles.heart} aria-label="אהבתי">
          <Icon.Heart size={26} />
        </button>
      </div>

      <div className={styles.seekRow}>
        <input
          className={styles.seek}
          type="range"
          min={0}
          max={audio.duration || 0}
          value={audio.current}
          step="0.1"
          onChange={(e) => audio.seek(Number(e.target.value))}
          style={{ "--pct": `${pct}%` }}
        />
        <div className={styles.times}>
          <span>{fmt(audio.current)}</span>
          <span>{fmt(audio.duration)}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button className={styles.ctlBtn} aria-label="ערבוב">
          <Icon.Shuffle size={24} />
        </button>
        <button className={styles.ctlBtn} aria-label="הקודם">
          <Icon.Prev size={32} />
        </button>
        <button className={styles.bigPlay} onClick={onPlay} aria-label="נגן">
          {audio.playing ? <Icon.Pause size={26} /> : <Icon.Play size={26} />}
        </button>
        <button className={styles.ctlBtn} aria-label="הבא">
          <Icon.Next size={32} />
        </button>
        <button className={styles.ctlBtn} aria-label="חזרה על שיר">
          <Icon.Repeat size={24} />
        </button>
      </div>

      <div className={styles.footer}>
        <button className={styles.footBtn} aria-label="שיתוף">
          <Icon.Share size={16} />
        </button>
        <button className={styles.footBtn} aria-label="מכשירים">
          <Icon.Device size={16} />
        </button>
      </div>
    </div>
  );
}
