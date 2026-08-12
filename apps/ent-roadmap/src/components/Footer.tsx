import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
      <div className="relative rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 p-8 sm:p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-8 animate-float">
            <Heart size={32} className="text-white" fill="currentColor" />
          </div>
          <div
            className="absolute bottom-8 left-12 animate-float"
            style={{ animationDelay: '1s' }}
          >
            <Heart size={24} className="text-white" fill="currentColor" />
          </div>
          <div
            className="absolute top-1/2 left-1/4 animate-float"
            style={{ animationDelay: '2s' }}
          >
            <Heart size={20} className="text-white" fill="currentColor" />
          </div>
        </div>

        <div className="relative text-center text-white">
          <div className="inline-flex mb-4">
            <Heart
              size={36}
              className="text-white animate-heart-pulse"
              fill="currentColor"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-balance">
            את תהיי רופאת אא״ג מדהימה
          </h2>
          <p className="text-white/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed text-balance">
            כל צעד קטן מהרשימה הזאת מקרב אותך ליעד. תתחילי מפריט אחד - והשאר יבוא.
          </p>
          <div className="mt-6 text-xs text-white/70">
            נבנה עם המון אהבה, אפריל 2026
          </div>
        </div>
      </div>
    </footer>
  );
}
