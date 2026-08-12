import { useEffect, useMemo, useState } from 'react';
import type { Tier } from '../types';

interface Props {
  tiers: Tier[];
}

interface DateGroup {
  date: string;
  label: string;
  fullLabel: string;
  tiers: Tier[];
  accent: Tier['accent'];
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}`;
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y.slice(2)}`;
}

export function TierNav({ tiers }: Props) {
  const groups = useMemo<DateGroup[]>(() => {
    const byDate = new Map<string, Tier[]>();
    tiers.forEach((t) => {
      const key = t.dateAdded ?? 'unknown';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(t);
    });
    const result: DateGroup[] = [];
    byDate.forEach((groupTiers, date) => {
      result.push({
        date,
        label: formatShortDate(date),
        fullLabel: formatFullDate(date),
        tiers: groupTiers,
        accent: groupTiers[0].accent,
      });
    });
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [tiers]);

  const [activeDate, setActiveDate] = useState<string>(groups[0]?.date ?? '');

  useEffect(() => {
    const tierToDate = new Map<string, string>();
    tiers.forEach((t) => {
      if (t.dateAdded) tierToDate.set(t.id, t.dateAdded);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('tier-', '').toUpperCase();
            const date = tierToDate.get(id);
            if (date) setActiveDate(date);
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    tiers.forEach((t) => {
      const el = document.getElementById(`tier-${t.id.toLowerCase()}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tiers]);

  const activeGroup = groups.find((g) => g.date === activeDate);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100/60">
      <div className="max-w-5xl mx-auto px-3 sm:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {groups.map((group) => {
            const isActive = activeDate === group.date;
            const isToday = group.date === today;
            const firstTierId = group.tiers[0].id;
            return (
              <a
                key={group.date}
                href={`#tier-${firstTierId.toLowerCase()}`}
                aria-label={`תאריך ${group.fullLabel}`}
                className={`
                  flex-shrink-0 inline-flex flex-col items-center justify-center
                  px-3.5 sm:px-5 h-12 sm:h-14
                  rounded-xl font-bold
                  transition-all duration-300
                  ${
                    isActive
                      ? `bg-gradient-to-br ${group.accent.gradient} text-white shadow-lg scale-105 ring-4 ring-white`
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:scale-105'
                  }
                `}
              >
                <span className="text-base sm:text-lg leading-none">
                  {group.label}
                </span>
                <span className={`text-[9px] sm:text-[10px] mt-0.5 leading-none font-semibold ${isActive ? 'text-white/85' : 'text-slate-400'}`}>
                  {(() => {
                    if (isToday) return 'היום';
                    if (group.tiers.length > 1) return `${group.tiers.length} טירים`;
                    const tid = group.tiers[0].id;
                    if (tid === 'NEW' || tid === 'NEW_NEW') return 'חדש';
                    return `Tier ${tid}`;
                  })()}
                </span>
              </a>
            );
          })}
        </div>

        {activeGroup && (
          <div
            key={activeGroup.date}
            className="text-center mt-2 text-[11px] sm:text-xs font-semibold text-slate-600 animate-fade-in"
          >
            <span className={activeGroup.accent.text}>נוסף {activeGroup.fullLabel}</span>
            <span className="text-slate-400 mx-1.5">•</span>
            <span>{activeGroup.tiers.map((t) => t.tagline).join(' · ')}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
