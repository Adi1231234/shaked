import { useState } from "react";
import * as Icon from "./icons.jsx";
import { shareLink } from "../share.js";
import styles from "./PlaylistScreen.module.css";

// מסך האלבום - רשימת השירים. לחיצה על שיר מנגנת אותו.
export default function PlaylistScreen({
  songs,
  playlistName,
  year,
  currentIndex,
  playing,
  onPlay,
  onPlayIndex,
  onBack,
}) {
  const [albumLiked, setAlbumLiked] = useState(false);
  const album = songs[0];

  return (
    <div className={styles.screen} style={{ "--accent": album.accent }}>
      <div className={styles.topbar}>
        <button className={styles.back} onClick={onBack} aria-label="חזרה">
          <Icon.Back size={24} />
        </button>
      </div>

      <div className={styles.scroll}>
        <div className={styles.coverWrap}>
          <img className={styles.cover} src={album.cover} alt={playlistName} />
        </div>

        <h1 className={styles.title}>{playlistName}</h1>

        <div className={styles.artistRow}>
          <span className={styles.avatar} />
          <span className={styles.artistName}>{album.artist}</span>
        </div>
        <div className={styles.meta}>
          {year} • {songs.length} שירים
        </div>

        <div className={styles.actions}>
          <div className={styles.icons}>
            <button className={styles.dim} onClick={shareLink} aria-label="עוד">
              <Icon.More size={24} />
            </button>
            <button className={styles.dim} onClick={shareLink} aria-label="שיתוף">
              <Icon.Share size={22} />
            </button>
            <button
              className={`${styles.dim} ${albumLiked ? styles.on : ""}`}
              onClick={() => setAlbumLiked((v) => !v)}
              aria-label="אהבתי"
            >
              {albumLiked ? <Icon.HeartFill size={24} /> : <Icon.Heart size={24} />}
            </button>
          </div>
          <button className={styles.play} onClick={onPlay} aria-label="נגן">
            {playing ? <Icon.Pause size={24} /> : <Icon.Play size={24} />}
          </button>
        </div>

        {songs.map((s, i) => (
          <button
            key={`${s.title}-${i}`}
            className={styles.row}
            onClick={() => onPlayIndex(i)}
          >
            <div className={styles.rowText}>
              <div
                className={`${styles.rowTitle} ${i === currentIndex ? styles.active : ""}`}
              >
                {s.title}
              </div>
              <div className={styles.rowArtist}>{s.artist}</div>
            </div>
            <span
              className={styles.rowMore}
              onClick={(e) => {
                e.stopPropagation();
                shareLink();
              }}
            >
              <Icon.More size={20} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
