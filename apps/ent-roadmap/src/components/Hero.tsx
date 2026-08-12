import { Heart, ArrowDown } from 'lucide-react';

export function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rose-100/60 via-pink-50/40 to-transparent" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-8 text-rose-200/40 animate-float">
          <Heart size={32} fill="currentColor" />
        </div>
        <div
          className="absolute top-48 left-12 text-pink-200/30 animate-float"
          style={{ animationDelay: '1s' }}
        >
          <Heart size={24} fill="currentColor" />
        </div>
        <div
          className="absolute top-32 left-1/3 text-fuchsia-200/30 animate-float"
          style={{ animationDelay: '2s' }}
        >
          <Heart size={20} fill="currentColor" />
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-rose-200/60 mb-6 shadow-sm">
            <span className="text-xs sm:text-sm text-rose-900 font-medium">
              לשקד, עם הרבה אהבה
            </span>
            <Heart size={14} className="text-rose-500 animate-heart-pulse" fill="currentColor" />
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-5 text-balance">
            <span className="bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">
              שקד
            </span>
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-slate-700 mb-3 text-balance">
            מפת הדרכים שלך לרפואת אף-אוזן-גרון
          </p>

          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed text-balance">
            28 תוכניות, קורסים והזדמנויות, ממוינים לפי ROI. מהכי משפיע לכמה שפחות -
            כדי שתדעי בדיוק איפה להשקיע את הזמן שלך.
          </p>

          <div className="mt-10 flex justify-center">
            <a
              href="#tier-s"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:scale-105 transition-all duration-300"
            >
              בואי נתחיל
              <ArrowDown
                size={18}
                className="group-hover:translate-y-0.5 transition-transform"
              />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
