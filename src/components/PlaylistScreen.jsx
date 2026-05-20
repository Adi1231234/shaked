import * as Icon from "./icons.jsx";
import styles from "./PlaylistScreen.module.css";

// מסך הפלייליסט - המסך הראשי, נראה כמו עמוד פלייליסט באפליקציה
export default function PlaylistScreen({ song, playing, onPlay, onPlaySong }) {
  return (
    <div className={styles.screen} style={{ "--accent": song.accent }}>
      <div className={styles.topbar}>
        <button className={styles.iconBtn} aria-label="חזרה">
          <Icon.Back size={24} />
        </button>
        <button className={styles.iconBtn} aria-label="עוד">
          <Icon.More size={22} />
        </button>
      </div>

      <div className={styles.scroll}>
        <div className={styles.coverWrap}>
          <img className={styles.cover} src={song.cover} alt={song.playlistName} />
        </div>

        <h1 className={styles.title}>{song.playlistName}</h1>

        <div className={styles.byline}>
          <Icon.Logo size={19} />
          <span>{song.artist}</span>
        </div>
        <div className={styles.meta}>סינגל • {song.year}</div>

        <div className={styles.actions}>
          <div className={styles.left}>
            <span className={styles.heart}>
              <Icon.Heart size={26} />
            </span>
            <span className={styles.dim}>
              <Icon.Download size={24} />
            </span>
            <span className={styles.dim}>
              <Icon.More size={24} />
            </span>
          </div>
          <div className={styles.right}>
            <span className={styles.dim}>
              <Icon.Shuffle size={26} />
            </span>
            <button className={styles.play} onClick={onPlay} aria-label="נגן">
              {playing ? <Icon.Pause size={26} /> : <Icon.Play size={26} />}
            </button>
          </div>
        </div>

        <button className={styles.row} onClick={onPlaySong}>
          <img className={styles.rowCover} src={song.cover} alt="" />
          <div className={styles.rowText}>
            <div className={`${styles.rowTitle} ${playing ? styles.active : ""}`}>
              {song.title}
            </div>
            <div className={styles.rowArtist}>{song.artist}</div>
          </div>
          <span className={styles.dim}>
            <Icon.More size={20} />
          </span>
        </button>
      </div>
    </div>
  );
}
