import { useState } from "react";
import PlaylistScreen from "./components/PlaylistScreen.jsx";
import PlayerScreen from "./components/PlayerScreen.jsx";
import MiniPlayer from "./components/MiniPlayer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { usePlayer } from "./hooks/usePlayer.js";
import { songs, playlistName, albumYear } from "./song.js";
import styles from "./App.module.css";

export default function App() {
  // נפתח ישירות על מסך הנגן
  const [playerOpen, setPlayerOpen] = useState(true);
  const player = usePlayer(songs);
  const progress = player.duration
    ? (player.current / player.duration) * 100
    : 0;

  return (
    <div className={styles.app}>
      <PlaylistScreen
        songs={songs}
        playlistName={playlistName}
        year={albumYear}
        currentIndex={player.index}
        playing={player.playing}
        onPlay={player.toggle}
        onPlayIndex={player.playIndex}
      />
      {!playerOpen && (
        <MiniPlayer
          song={player.song}
          playing={player.playing}
          progress={progress}
          onToggle={player.toggle}
          onExpand={() => setPlayerOpen(true)}
        />
      )}
      <BottomNav />
      {playerOpen && (
        <PlayerScreen
          player={player}
          playlistName={playlistName}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </div>
  );
}
