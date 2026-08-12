// ===================================================================
//  Config file - album and song details.
//  Media files (mp3 + covers) live in the public/ folder.
//  To add a song: copy a whole { ... } block and add it to the list.
// ===================================================================

const base = import.meta.env.BASE_URL;

// Album name and year shown at the top
export const playlistName = "Together";
export const albumYear = "2026";

// Artist photo (the circle next to the artist name) - file in public/
export const artistImage = base + "artist.jpg";

export const songs = [
  {
    title: "You're the Best",
    artist: "Leonardo",
    cover: base + "cover2.jpg",
    audio: base + "youre-the-best.mp3",
    accent: "#7e6a54", // player background color
  },
  {
    title: "Shuli",
    artist: "Leonardo",
    cover: base + "cover1.jpg",
    audio: base + "shuli.mp3",
    accent: "#9c7b4e",
  },
];
