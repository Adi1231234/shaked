import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import './Design4Modern.css';

export default function Design4Modern() {
  const d = useCv();
  const lang = useLang();
  return (
    <div className="d4-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="d4-hero">
        <h1><Editable path="firstName" /> <Editable path="lastName" /></h1>
        <div className="d4-role"><Editable path="role" /></div>
        <div className="d4-contact-grid">
          <span>📞 <Editable path="contact.phone" /></span>
          <span>✉ <Editable path="contact.email" /></span>
          <span>📍 <Editable path="contact.location" /></span>
          <span>· <Editable path="contact.maritalStatus" /></span>
          <span>· <Editable path="contact.birthInfo" /></span>
        </div>
      </header>

      <section className="d4-card d4-profile">
        <h2><Editable path="labels.aboutMe" /></h2>
        {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
      </section>

      <div className="d4-grid">
        <section className="d4-card">
          <h2><Editable path="labels.strengths" /></h2>
          <ul className="d4-chips">
            {d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}
          </ul>
        </section>
        <section className="d4-card">
          <h2><Editable path="labels.languages" /></h2>
          <ul className="d4-chips">
            {d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}
          </ul>
          <h2 className="d4-h2-gap"><Editable path="labels.futurePlans" /></h2>
          <ul className="d4-plain">
            {d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}
          </ul>
        </section>
      </div>

      <section className="d4-card">
        <h2><Editable path="labels.education" /></h2>
        <div className="d4-timeline">
          {d.education.map((e, i) => (
            <div className="d4-tl-item" key={i}>
              <div className="d4-tl-dot"></div>
              <div className="d4-tl-date"><Editable path={`education.${i}.date`} /></div>
              <div className="d4-tl-body">
                <Editable as="strong" path={`education.${i}.place`} /> <Editable path={`education.${i}.details`} />
                {e.bullets.length > 0 && <ul>{e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}</ul>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="d4-card">
        <h2><Editable path="labels.workExperience" /></h2>
        <ul className="d4-chips">
          {d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}
        </ul>
      </section>

      <section className="d4-card">
        <h2><Editable path="labels.militaryService" /></h2>
        <div className="d4-timeline">
          {d.military.map((j, i) => (
            <div className="d4-tl-item" key={i}>
              <div className="d4-tl-dot"></div>
              <div className="d4-tl-date"><Editable path={`military.${i}.date`} /></div>
              <div className="d4-tl-body">
                <Editable as="strong" path={`military.${i}.title`} />
                <ul>{j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="d4-card">
        <h2><Editable path="labels.volunteering" /></h2>
        <ul className="d4-chips">
          {d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}
        </ul>
      </section>
    </div>
  );
}
