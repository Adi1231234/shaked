// אוסף האייקונים של ממשק Spotify. כולם 24x24, צובעים דרך currentColor.
const I = ({ size = 24, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
    {children}
  </svg>
);

export const Play = (p) => (
  <I {...p}>
    <path d="M8 5v14l11-7z" />
  </I>
);
export const Pause = (p) => (
  <I {...p}>
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </I>
);
export const Next = (p) => (
  <I {...p}>
    <path d="M6 18l8.5-6L6 6v12zM16 6h2.2v12H16z" />
  </I>
);
export const Prev = (p) => (
  <I {...p}>
    <path d="M18 6l-8.5 6L18 18V6zM5.8 6H8v12H5.8z" />
  </I>
);
export const Shuffle = (p) => (
  <I {...p}>
    <path d="M10.6 9.2L5.4 4 4 5.4l5.2 5.2 1.4-1.4zM14.5 4l2 2L4 18.6 5.4 20 18 7.5 20 9.5V4zm.3 9.4l-1.4 1.4 3.1 3.1L14.5 20H20v-5.5l-2 2-3.2-3z" />
  </I>
);
export const Repeat = (p) => (
  <I {...p}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />
  </I>
);
export const Heart = (p) => (
  <I {...p}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
  </I>
);
export const ChevronDown = (p) => (
  <I {...p}>
    <path d="M7.4 8.6L12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
  </I>
);
export const Back = (p) => (
  <I {...p}>
    <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" />
  </I>
);
export const More = (p) => (
  <I {...p}>
    <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4z" />
  </I>
);
export const Download = (p) => (
  <I {...p}>
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2z" />
  </I>
);
export const Home = (p) => (
  <I {...p}>
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </I>
);
export const Search = (p) => (
  <I {...p}>
    <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 10-.7.7l.3.3v.8l5 5 1.5-1.5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z" />
  </I>
);
export const Library = (p) => (
  <I {...p}>
    <path d="M14.5 2.1a1 1 0 011 0l6 3.5a1 1 0 01.5.9V21a1 1 0 01-1 1h-6a1 1 0 01-1-1V3a1 1 0 01.5-.9zM4 2a1 1 0 011 1v18a1 1 0 11-2 0V3a1 1 0 011-1zm5 0a1 1 0 011 1v18a1 1 0 11-2 0V3a1 1 0 011-1z" />
  </I>
);
export const Device = (p) => (
  <I {...p}>
    <path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5v2h3v2H8v-2h3v-2H5a2 2 0 01-2-2z" />
  </I>
);
export const Share = (p) => (
  <I {...p}>
    <path d="M18 16.1c-.8 0-1.4.3-2 .8l-7.1-4.2c.1-.4.1-1 0-1.4l7-4.1c.6.5 1.3.8 2.1.8a3 3 0 10-3-3c0 .2 0 .5.1.7L8 9.8a3 3 0 100 4.4l7.1 4.2c-.1.6 0 1.3.3 1.8a3 3 0 102.6-4.1z" />
  </I>
);
export const Logo = ({ size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...p}>
    <circle cx="12" cy="12" r="12" fill="#1ed760" />
    <path d="M5.8 9.4c4-1.2 8.7-.8 12.3 1.4" stroke="#000" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <path d="M6.6 12.9c3.3-.9 7-.6 9.9 1.1" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M7.4 16c2.6-.7 5.4-.5 7.7.9" stroke="#000" strokeWidth="1.3" fill="none" strokeLinecap="round" />
  </svg>
);
