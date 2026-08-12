import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import { IconCalendar, IconMail, IconPhone, IconPin, IconUser } from './Icons';
import './DesignClassicEmerald.css';

export default function DesignClassicEmerald() {
  const d = useCv();
  const lang = useLang();

  return (
    <div className="d1e-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="d1e-header">
        <div className="d1e-seal">SA</div>
        <div className="d1e-title">
          <h1><Editable path="firstName" /> <Editable path="lastName" /></h1>
          <div><Editable path="role" /></div>
        </div>
        <div className="d1e-contact">
          <span><IconPhone /><Editable path="contact.phone" /></span>
          <span><IconMail /><Editable path="contact.email" /></span>
          <span><IconPin /><Editable path="contact.location" /></span>
          <span><IconUser /><Editable path="contact.maritalStatus" /></span>
          <span><IconCalendar /><Editable path="contact.birthInfo" /></span>
        </div>
      </header>

      <div className="d1e-layout">
        <main className="d1e-main">
          <section className="d1e-profile">
            <h2><Editable path="labels.profile" /></h2>
            {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
          </section>

          <section>
            <h2><Editable path="labels.education" /></h2>
            <div className="d1e-edu-list">
              {d.education.map((e, i) => (
                <div className="d1e-edu" key={i}>
                  <div className="d1e-date"><Editable path={`education.${i}.date`} /></div>
                  <div>
                    <Editable as="strong" path={`education.${i}.place`} />{' '}
                    <Editable path={`education.${i}.details`} />
                    {e.bullets.length > 0 && <ul>{e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}</ul>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2><Editable path="labels.workExperience" /></h2>
            <ul className="d1e-work-list">{d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}</ul>
          </section>

          <section>
            <h2><Editable path="labels.militaryService" /></h2>
            <div className="d1e-timeline">
              {d.military.map((j, i) => (
                <article className="d1e-item" key={i}>
                  <div className="d1e-date"><Editable path={`military.${i}.date`} /></div>
                  <div>
                    <h3><Editable path={`military.${i}.title`} /></h3>
                    <ul>{j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="d1e-rail">
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
