import type { Tier } from '../types';
import { ProgramCard } from './ProgramCard';

interface Props {
  tier: Tier;
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}`;
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y.slice(2)}`;
}

export function TierSection({ tier }: Props) {
  const isDateTier = tier.id === 'NEW' || tier.id === 'NEW_NEW';
  const badgeText = isDateTier && tier.dateAdded ? formatShortDate(tier.dateAdded) : tier.id;
  const overlineText = isDateTier && tier.dateAdded
    ? `נוסף ${formatFullDate(tier.dateAdded)}`
    : `Tier ${tier.id}`;

  return (
    <section
      id={`tier-${tier.id.toLowerCase()}`}
      className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 scroll-mt-20"
    >
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`
              inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16
              rounded-2xl ${tier.accent.badge} shadow-lg
              font-extrabold ${isDateTier ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}
            `}
          >
            {badgeText}
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {overlineText}
            </div>
            <h2
              className={`text-xl sm:text-2xl font-extrabold bg-gradient-to-r ${tier.accent.gradient} bg-clip-text text-transparent`}
            >
              {tier.tagline}
            </h2>
          </div>
        </div>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
          {tier.description}
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {tier.programs.map((program) => (
          <ProgramCard key={program.rank} program={program} tier={tier} />
        ))}
      </div>
    </section>
  );
}
