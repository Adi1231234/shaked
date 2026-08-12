import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import './Design3Elegant.css';

export default function Design3Elegant() {
  const d = useCv();
  const lang = useLang();
  return (
    <div className="d3-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="d3-header">
        <div className="d3-ornament">❦</div>
        <h1><Editable path="firstName" /> <Editable path="lastName" /></h1>
        <div className="d3-rule"><span></span><Editable as="em" path="role" /><span></span></div>
        <div className="d3-contact">
          <Editable path="contact.phone" /> &nbsp;·&nbsp; <Editable path="contact.email" /> &nbsp;·&nbsp; <Editable path="contact.location" />
        </div>
        <div className="d3-contact">
          <Editable path="contact.maritalStatus" /> &nbsp;·&nbsp; <Editable path="contact.birthInfo" />
        </div>
      </header>

      <section className="d3-section">
        <h2><Editable path="labels.profile" /></h2>
        {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
      </section>

      <section className="d3-section">
        <h2><Editable path="labels.education" /></h2>
        {d.education.map((e, i) => (
          <div className="d3-item" key={i}>
            <div className="d3-item-head">
              <span className="d3-item-title"><Editable path={`education.${i}.place`} /> <Editable path={`education.${i}.details`} /></span>
              <Editable as="span" className="d3-item-date" path={`education.${i}.date`} />
            </div>
            {e.bullets.length > 0 && (
              <ul className="d3-list">
                {e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="d3-section">
        <h2><Editable path="labels.workExperience" /></h2>
        <ul className="d3-list">{d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}</ul>
      </section>

      <section className="d3-section">
        <h2><Editable path="labels.militaryService" /></h2>
        {d.military.map((j, i) => (
          <div className="d3-item" key={i}>
            <div className="d3-item-head">
              <Editable as="span" className="d3-item-title" path={`military.${i}.title`} />
              <Editable as="span" className="d3-item-date" path={`military.${i}.date`} />
            </div>
            <ul className="d3-list">
              {j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}
            </ul>
          </div>
        ))}
      </section>

      <div className="d3-grid">
        <section className="d3-section">
          <h2><Editable path="labels.strengths" /></h2>
          <ul className="d3-list">{d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}</ul>
        </section>
        <section className="d3-section">
          <h2><Editable path="labels.languages" /></h2>
          <ul className="d3-list">{d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}</ul>
          <h2 className="d3-sub"><Editable path="labels.futurePlans" /></h2>
          <ul className="d3-list">{d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}</ul>
        </section>
      </div>

      <section className="d3-section">
        <h2><Editable path="labels.volunteering" /></h2>
        <ul className="d3-list">{d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}</ul>
      </section>
    </div>
  );
}
