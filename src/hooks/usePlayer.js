import { useEffect, useRef, useState } from "react";

// hook שמנהל פלייליסט: ניגון, מעבר בין שירים, והמשך אוטומטי לשיר הבא
export function usePlayer(songs) {
  const audioRef = useRef(null);
  const autoPlay = useRef(false); // האם לנגן מיד כשהשיר הבא נטען
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(songs[index].audio);
    audioRef.current = audio;
    setCurrent(0);
    setDuration(0);

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      // השיר נגמר - מעבר אוטומטי לשיר הבא
      autoPlay.current = true;
      setIndex((i) => (i + 1) % songs.length);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);

    if (autoPlay.current) {
      autoPlay.current = false;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [index, songs]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (t) => {
    const a = audioRef.current;
    if (a) {
      a.currentTime = t;
      setCurrent(t);
    }
  };

  const switchTo = (n) => {
    autoPlay.current = true;
    setPlaying(false);
    setIndex(((n % songs.length) + songs.length) % songs.length);
  };

  const next = () => switchTo(index + 1);
  const prev = () => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) seek(0); // כמו ב-Spotify: אחרי 3 שניות חוזרים להתחלה
    else switchTo(index - 1);
  };
  const playIndex = (i) => (i === index ? toggle() : switchTo(i));

  return {
    song: songs[index],
    index,
    playing,
    current,
    duration,
    toggle,
    seek,
    next,
    prev,
    playIndex,
  };
}
