import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import './DesignClassicSlate.css';

export default function DesignClassicSlate() {
  const d = useCv();
  const lang = useLang();

  return (
    <div className="d1s-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="d1s-header">
        <div className="d1s-name">
          <Editable as="span" path="firstName" />
          <Editable as="span" path="lastName" />
        </div>
        <div className="d1s-role"><Editable path="role" /></div>
      </header>

      <div className="d1s-contact">
        <span><Editable path="contact.phone" /></span>
        <span><Editable path="contact.email" /></span>
        <span><Editable path="contact.location" /></span>
        <span><Editable path="contact.maritalStatus" /></span>
        <span><Editable path="contact.birthInfo" /></span>
      </div>

      <section className="d1s-profile">
        <h2><Editable path="labels.profile" /></h2>
        <div>
          {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
        </div>
      </section>

      <div className="d1s-grid">
        <main className="d1s-main">
          <section>
            <h2><Editable path="labels.education" /></h2>
            {d.education.map((e, i) => (
              <article className="d1s-row" key={i}>
                <div className="d1s-date"><Editable path={`education.${i}.date`} /></div>
                <div>
                  <h3><Editable path={`education.${i}.place`} />{' '}<Editable path={`education.${i}.details`} /></h3>
                  {e.bullets.length > 0 && <ul>{e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}</ul>}
                </div>
              </article>
            ))}
          </section>

          <section>
            <h2><Editable path="labels.workExperience" /></h2>
            <ul className="d1s-work-list">{d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}</ul>
          </section>

          <section>
            <h2><Editable path="labels.militaryService" /></h2>
            {d.military.map((j, i) => (
              <article className="d1s-row" key={i}>
                <div className="d1s-date"><Editable path={`military.${i}.date`} /></div>
                <div>
                  <h3><Editable path={`military.${i}.title`} /></h3>
                  <ul>{j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}</ul>
                </div>
              </article>
            ))}
          </section>
        </main>

        <aside className="d1s-side">
          <section>
            <h2><Editable path="labels.strengths" /></h2>
            <ul>{d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}</ul>
          </section>
          <section>
            <h2><Editable path="labels.languages" /></h2>
            <ul>{d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}</ul>
          </section>
          <section>
            <h2><Editable path="labels.futurePlans" /></h2>
            <ul>{d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}</ul>
          </section>
          <section>
            <h2><Editable path="labels.volunteering" /></h2>
            <ul>{d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
