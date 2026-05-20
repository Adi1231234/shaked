// ===================================================================
//  קובץ ההגדרות - פרטי האלבום והשירים.
//  הקבצים (mp3 + עטיפות) נמצאים בתיקיית public/.
//  להוספת שיר: מעתיקים בלוק { ... } שלם ומוסיפים לרשימה.
// ===================================================================

const base = import.meta.env.BASE_URL;

// שם האלבום והשנה שמוצגים בראש המסך
export const playlistName = "Together";
export const albumYear = "2026";

export const songs = [
  {
    title: "Shuli",
    artist: "Leonardo",
    cover: base + "cover1.jpg",
    audio: base + "shuli.mp3",
    accent: "#9c7b4e", // צבע הרקע - נגזר מהעטיפה החמה
  },
  {
    title: "You're the Best",
    artist: "Leonardo",
    cover: base + "cover2.jpg",
    audio: base + "youre-the-best.mp3",
    accent: "#7e6a54",
  },
];
