import * as Icon from "./icons.jsx";
import { fmt } from "../format.js";
import styles from "./PlayerScreen.module.css";

// מסך הנגן המלא - נפתח בלחיצה על הנגן הקטן
export default function PlayerScreen({ song, audio, onPlay, onClose }) {
  const pct = audio.duration ? (audio.current / audio.duration) * 100 : 0;

  return (
    <div className={styles.player} style={{ "--accent": song.accent }}>
      <div className={styles.top}>
        <button className={styles.iconBtn} onClick={onClose} aria-label="סגור">
          <Icon.ChevronDown size={26} />
        </button>
        <div className={styles.from}>
          <div className={styles.fromLabel}>מתנגן מתוך פלייליסט</div>
          <div className={styles.fromName}>{song.playlistName}</div>
        </div>
        <button className={styles.iconBtn} aria-label="עוד">
          <Icon.More size={22} />
        </button>
      </div>

      <div className={styles.artWrap}>
        <img className={styles.art} src={song.cover} alt={song.title} />
      </div>

      <div className={styles.info}>
        <div className={styles.titles}>
          <div className={styles.songTitle}>{song.title}</div>
          <div className={styles.songArtist}>{song.artist}</div>
        </div>
        <span className={styles.heart}>
          <Icon.Heart size={26} />
        </span>
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
        <span className={styles.ctlDim}>
          <Icon.Shuffle size={22} />
        </span>
        <span className={styles.ctl}>
          <Icon.Prev size={36} />
        </span>
        <button className={styles.bigPlay} onClick={onPlay} aria-label="נגן">
          {audio.playing ? <Icon.Pause size={30} /> : <Icon.Play size={30} />}
        </button>
        <span className={styles.ctl}>
          <Icon.Next size={36} />
        </span>
        <span className={styles.ctlDim}>
          <Icon.Repeat size={22} />
        </span>
      </div>

      <div className={styles.bottom}>
        <span className={styles.ctlDim}>
          <Icon.Device size={20} />
        </span>
        <span className={styles.ctlDim}>
          <Icon.Share size={20} />
        </span>
      </div>
    </div>
  );
}
