import { useState } from "react";
import * as Icon from "./icons.jsx";
import { fmt } from "../format.js";
import { shareLink } from "../share.js";
import { showToast } from "../toast.js";
import CoverCarousel from "./CoverCarousel.jsx";
import styles from "./PlayerScreen.module.css";

// The now-playing screen - pixel-perfect to Spotify, with a sliding cover carousel
export default function PlayerScreen({ player, playlistName, onClose }) {
  const { song, playing, current, duration, shuffle, repeat, liked } = player;
  const pct = duration ? (current / duration) * 100 : 0;
  const [closing, setClosing] = useState(false);

  return (
    <div
      className={`${styles.player} ${closing ? styles.closing : ""}`}
      style={{ "--accent": song.accent }}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.top}>
        <button
          className={styles.iconBtn}
          onClick={() => setClosing(true)}
          aria-label="Close"
        >
          <Icon.ChevronDown size={24} />
        </button>
        <div className={styles.headerTitle}>{playlistName}</div>
        <button className={styles.iconBtn} onClick={shareLink} aria-label="More">
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
          aria-label="Like"
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
          aria-label="Shuffle"
        >
          <Icon.Shuffle size={24} />
        </button>
        <button
          className={`${styles.ctlBtn} ${styles.skipBtn}`}
          onClick={player.prev}
          aria-label="Previous"
        >
          <Icon.Prev size={32} />
        </button>
        <button className={styles.bigPlay} onClick={player.toggle} aria-label="Play">
          <span className={styles.bigPlayCircle}>
            {playing ? <Icon.Pause size={24} /> : <Icon.Play size={24} />}
          </span>
        </button>
        <button
          className={`${styles.ctlBtn} ${styles.skipBtn}`}
          onClick={player.next}
          aria-label="Next"
        >
          <Icon.Next size={32} />
        </button>
        <button
          className={`${styles.ctlBtn} ${styles.smallBtn} ${repeat !== "off" ? styles.on : ""}`}
          onClick={player.cycleRepeat}
          aria-label="Repeat"
        >
          <Icon.Repeat size={24} />
        </button>
      </div>

      <div className={styles.footer}>
        <button className={styles.footBtn} onClick={shareLink} aria-label="Share">
          <Icon.Share size={16} />
        </button>
        <button
          className={`${styles.footBtn} ${styles.connectBtn}`}
          onClick={() => showToast("Playing on this device")}
          aria-label="Devices"
        >
          <Icon.Device size={16} />
        </button>
      </div>
    </div>
  );
}
