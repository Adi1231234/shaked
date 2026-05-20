import { useState } from "react";
import PlaylistScreen from "./components/PlaylistScreen.jsx";
import PlayerScreen from "./components/PlayerScreen.jsx";
import MiniPlayer from "./components/MiniPlayer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { useAudio } from "./hooks/useAudio.js";
import { song } from "./song.js";
import styles from "./App.module.css";

export default function App() {
  // נפתח ישירות על מסך הנגן - זה העמוד שצריך להיות פיקסל-פרפקט מול Spotify
  const [playerOpen, setPlayerOpen] = useState(true);
  const [started, setStarted] = useState(true);
  const audio = useAudio(song.audio);

  const startSong = () => {
    setStarted(true);
    audio.play();
  };
  const togglePlay = () => {
    setStarted(true);
    audio.toggle();
  };
  const progress = audio.duration ? (audio.current / audio.duration) * 100 : 0;

  return (
    <div className={styles.app}>
      <PlaylistScreen
        song={song}
        playing={audio.playing}
        onPlay={togglePlay}
        onPlaySong={startSong}
      />
      {started && !playerOpen && (
        <MiniPlayer
          song={song}
          playing={audio.playing}
          progress={progress}
          onToggle={togglePlay}
          onExpand={() => setPlayerOpen(true)}
        />
      )}
      <BottomNav />
      {playerOpen && (
        <PlayerScreen
          song={song}
          audio={audio}
          onPlay={togglePlay}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </div>
  );
}
