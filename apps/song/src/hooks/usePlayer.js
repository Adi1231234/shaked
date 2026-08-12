import { useEffect, useRef, useState } from "react";
import { load, save } from "../store.js";

// hook שמנהל את הפלייליסט: ניגון, מעבר, ערבוב, חזרה, ולבבות.
// כל המצב נשמר ב-localStorage ומשוחזר בטעינה.
export function usePlayer(songs) {
  const audioRef = useRef(null);
  const autoPlay = useRef(false);
  const [index, setIndex] = useState(() => {
    const i = load("index", 0);
    return Number.isInteger(i) && i >= 0 && i < songs.length ? i : 0;
  });
  const [dir, setDir] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(() => load("shuffle", false) === true);
  const [repeat, setRepeat] = useState(() => load("repeat", "off"));
  const [liked, setLiked] = useState(() => new Set(load("liked", [])));

  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;

  useEffect(() => {
    save("index", index);
    save("shuffle", shuffle);
    save("repeat", repeat);
  }, [index, shuffle, repeat]);

  const randomOther = (i) => {
    let r = i;
    while (r === i) r = Math.floor(Math.random() * songs.length);
    return r;
  };

  useEffect(() => {
    const audio = new Audio(songs[index].audio);
    audioRef.current = audio;
    setCurrent(0);
    setDuration(0);
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const last = songs.length - 1;
      if (index === last && repeatRef.current === "off" && !shuffleRef.current) {
        setPlaying(false);
        return;
      }
      autoPlay.current = true;
      setDir(1);
      setIndex(
        shuffleRef.current && songs.length > 1
          ? randomOther(index)
          : (index + 1) % songs.length,
      );
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

  // toggle מבוסס על ה-state, לא על audio.paused - כדי שיתחלף נכון תמיד
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
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

  const next = () =>
    switchTo(shuffle && songs.length > 1 ? randomOther(index) : index + 1, 1);
  const prev = () => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) seek(0);
    else switchTo(index - 1, -1);
  };
  const playIndex = (i) =>
    i === index ? toggle() : switchTo(i, i > index ? 1 : -1);

  const toggleLike = () =>
    setLiked((s) => {
      const n = new Set(s);
      if (n.has(index)) n.delete(index);
      else n.add(index);
      save("liked", [...n]);
      return n;
    });

  return {
    song: songs[index],
    index,
    dir,
    playing,
    current,
    duration,
    shuffle,
    repeat,
    liked: liked.has(index),
    toggle,
    seek,
    next,
    prev,
    playIndex,
    toggleLike,
    toggleShuffle: () => setShuffle((s) => !s),
    cycleRepeat: () =>
      setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
  };
}
