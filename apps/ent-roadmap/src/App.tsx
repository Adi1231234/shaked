import { Hero } from './components/Hero';
import { StatsBar } from './components/StatsBar';
import { TierNav } from './components/TierNav';
import { TierSection } from './components/TierSection';
import { Footer } from './components/Footer';
import { tiers } from './data/roadmap';

function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <StatsBar />
      <div className="h-8 sm:h-12" />
      <TierNav tiers={tiers} />
      <main>
        {tiers.map((tier) => (
          <div key={tier.id}>
            {tier.sectionStart && (
              <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-l from-slate-300 to-transparent" />
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-700">
                    {tier.sectionStart}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent" />
                </div>
              </div>
            )}
            <TierSection tier={tier} />
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}

export default App;
