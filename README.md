# Spotify Song Site

אתר React שנראה כמו אפליקציית הטלפון של Spotify, ומציג שיר אחד שלך.

## איך מריצים

```powershell
cd C:\Users\adi12\Documents\projects\spotify-song-site
npm install
npm run dev
```

הדפדפן ייפתח בכתובת http://127.0.0.1:5180

## איך מוסיפים את השיר שלך

1. שים את קובץ האודיו בתיקייה `public/` בשם `song.mp3`
2. שים את תמונת העטיפה בתיקייה `public/` בשם `cover.jpg`
3. פתח את `src/song.js` ועדכן:
   - `title` - שם השיר
   - `artist` - שם האמן
   - `playlistName` - שם הפלייליסט שמוצג למעלה
   - `year` - שנה
   - `cover` - שנה ל-`/cover.jpg` (אחרי שהוספת תמונה)
   - `accent` - צבע הרקע של הנגן (כדאי צבע שמתאים לעטיפה)

זהו. רענן את הדפדפן והשיר שלך מופיע.

## מבנה

- `src/components/PlaylistScreen.jsx` - מסך הפלייליסט הראשי
- `src/components/PlayerScreen.jsx` - מסך הנגן המלא
- `src/components/MiniPlayer.jsx` - הנגן הקטן התחתון
- `src/components/BottomNav.jsx` - סרגל הניווט
- `src/hooks/useAudio.js` - ניהול ניגון האודיו
