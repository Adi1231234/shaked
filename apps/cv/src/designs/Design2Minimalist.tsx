import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import './Design2Minimalist.css';

export default function Design2Minimalist() {
  const d = useCv();
  const lang = useLang();
  return (
    <div className="d2-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="d2-header">
        <h1><Editable path="firstName" /> <Editable path="lastName" /></h1>
        <div className="d2-role"><Editable path="role" /></div>
        <div className="d2-contact">
          <span><Editable path="contact.phone" /></span>
          <span className="d2-sep">·</span>
          <span><Editable path="contact.email" /></span>
          <span className="d2-sep">·</span>
          <span><Editable path="contact.location" /></span>
          <span className="d2-sep">·</span>
          <span><Editable path="contact.maritalStatus" /></span>
          <span className="d2-sep">·</span>
          <span><Editable path="contact.birthInfo" /></span>
        </div>
      </header>

      <section className="d2-section">
        <h2><Editable path="labels.profile" /></h2>
        {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
      </section>

      <section className="d2-section">
        <h2><Editable path="labels.education" /></h2>
        {d.education.map((e, i) => (
          <div className="d2-row" key={i}>
            <div className="d2-row-date"><Editable path={`education.${i}.date`} /></div>
            <div className="d2-row-body">
              <div className="d2-row-title"><Editable path={`education.${i}.place`} /> <Editable path={`education.${i}.details`} /></div>
              {e.bullets.length > 0 && (
                <ul>{e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}</ul>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="d2-section">
        <h2><Editable path="labels.workExperience" /></h2>
        <ul className="d2-plain">{d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}</ul>
      </section>

      <section className="d2-section">
        <h2><Editable path="labels.militaryService" /></h2>
        {d.military.map((j, i) => (
          <div className="d2-row" key={i}>
            <div className="d2-row-date"><Editable path={`military.${i}.date`} /></div>
            <div className="d2-row-body">
              <div className="d2-row-title"><Editable path={`military.${i}.title`} /></div>
              <ul>{j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}</ul>
            </div>
          </div>
        ))}
      </section>

      <section className="d2-section d2-two-col">
        <div>
          <h2><Editable path="labels.strengths" /></h2>
          <ul className="d2-plain">{d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}</ul>
        </div>
        <div>
          <h2><Editable path="labels.languages" /></h2>
          <ul className="d2-plain">{d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}</ul>
          <h2 className="d2-h2-spaced"><Editable path="labels.futurePlans" /></h2>
          <ul className="d2-plain">{d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}</ul>
        </div>
      </section>

      <section className="d2-section">
        <h2><Editable path="labels.volunteering" /></h2>
        <ul className="d2-plain">{d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}</ul>
      </section>
    </div>
  );
}
