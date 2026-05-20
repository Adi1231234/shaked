import * as Icon from "./icons.jsx";
import styles from "./PlaylistScreen.module.css";

// מסך האלבום - מבנה זהה לעמוד אלבום אמיתי ב-Spotify (נשאב מהטאב)
export default function PlaylistScreen({ song, playing, onPlay, onPlaySong }) {
  return (
    <div className={styles.screen} style={{ "--accent": song.accent }}>
      <div className={styles.topbar}>
        <button className={styles.back} aria-label="חזרה">
          <Icon.Back size={24} />
        </button>
      </div>

      <div className={styles.scroll}>
        <div className={styles.coverWrap}>
          <img className={styles.cover} src={song.cover} alt={song.playlistName} />
        </div>

        <h1 className={styles.title}>{song.playlistName}</h1>

        <div className={styles.artistRow}>
          <span className={styles.avatar} />
          <span className={styles.artistName}>{song.artist}</span>
        </div>
        <div className={styles.meta}>{song.year} • סינגל</div>

        <div className={styles.actions}>
          <div className={styles.icons}>
            <button className={styles.dim} aria-label="עוד">
              <Icon.More size={24} />
            </button>
            <button className={styles.dim} aria-label="שיתוף">
              <Icon.Share size={22} />
            </button>
            <button className={styles.dim} aria-label="אהבתי">
              <Icon.Heart size={24} />
            </button>
          </div>
          <button className={styles.play} onClick={onPlay} aria-label="נגן">
            {playing ? <Icon.Pause size={24} /> : <Icon.Play size={24} />}
          </button>
        </div>

        <button className={styles.row} onClick={onPlaySong}>
          <div className={styles.rowText}>
            <div className={`${styles.rowTitle} ${playing ? styles.active : ""}`}>
              {song.title}
            </div>
            <div className={styles.rowArtist}>{song.artist}</div>
          </div>
          <span className={styles.rowMore}>
            <Icon.More size={20} />
          </span>
        </button>
      </div>
    </div>
  );
}
