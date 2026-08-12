import { Clock, Sparkles, Target } from 'lucide-react';

export function StatsBar() {
  const stats = [
    {
      icon: Sparkles,
      label: 'פעולות מיידיות',
      value: '4',
      sublabel: 'תוך שבוע',
      color: 'from-rose-500 to-pink-500',
    },
    {
      icon: Clock,
      label: 'חינמיות לגמרי',
      value: '11',
      sublabel: 'ללא עלות',
      color: 'from-purple-500 to-indigo-500',
    },
    {
      icon: Target,
      label: 'סה״כ הזדמנויות',
      value: '28',
      sublabel: 'ב-5 רמות עדיפות',
      color: 'from-indigo-500 to-blue-500',
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-8 -mt-4 sm:-mt-6 relative z-10">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass rounded-2xl p-3 sm:p-5 border border-white/60 card-shadow hover:card-shadow-lg transition-shadow"
          >
            <div
              className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${s.color} text-white mb-2 sm:mb-3`}
            >
              <s.icon size={16} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-none">
              {s.value}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-1">
              {s.label}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {s.sublabel}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
