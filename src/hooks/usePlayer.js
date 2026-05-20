import { useEffect, useRef, useState } from "react";

// hook שמנהל פלייליסט: ניגון, מעבר בין שירים, והמשך אוטומטי לשיר הבא.
// dir = כיוון המעבר האחרון (1 קדימה, -1 אחורה) - משמש לאנימציית ההחלקה.
export function usePlayer(songs) {
  const audioRef = useRef(null);
  const autoPlay = useRef(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
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
      autoPlay.current = true;
      setDir(1);
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

  const switchTo = (n, d) => {
    autoPlay.current = true;
    setDir(d);
    setPlaying(false);
    setIndex(((n % songs.length) + songs.length) % songs.length);
  };

  const next = () => switchTo(index + 1, 1);
  const prev = () => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) seek(0); // כמו Spotify: אחרי 3 שניות חוזרים להתחלה
    else switchTo(index - 1, -1);
  };
  const playIndex = (i) => {
    if (i === index) toggle();
    else switchTo(i, i > index ? 1 : -1);
  };

  return {
    song: songs[index],
    index,
    dir,
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
