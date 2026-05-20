import * as Icon from "./icons.jsx";
import styles from "./MiniPlayer.module.css";

// The mini player above the nav bar. Tapping it opens the full player.
export default function MiniPlayer({
  song,
  playing,
  liked,
  progress,
  onToggle,
  onLike,
  onExpand,
}) {
  const stop = (e) => e.stopPropagation();

  return (
    <div
      className={styles.mini}
      style={{ "--accent": song.accent }}
      onClick={onExpand}
    >
      <img className={styles.cover} src={song.cover} alt="" />
      <div className={styles.text}>
        <div className={styles.title}>{song.title}</div>
        <div className={styles.artist}>{song.artist}</div>
      </div>
      <button
        className={`${styles.icon} ${liked ? styles.on : ""}`}
        onClick={(e) => {
          stop(e);
          onLike();
        }}
        aria-label="Like"
      >
        {liked ? <Icon.HeartFill size={22} /> : <Icon.Heart size={22} />}
      </button>
      <button
        className={styles.icon}
        onClick={(e) => {
          stop(e);
          onToggle();
        }}
        aria-label="Play"
      >
        {playing ? <Icon.Pause size={24} /> : <Icon.Play size={24} />}
      </button>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
