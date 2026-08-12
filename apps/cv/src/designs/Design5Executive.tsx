import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import './Design5Executive.css';

export default function Design5Executive() {
  const d = useCv();
  const lang = useLang();
  return (
    <div className="d5-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="d5-topbar"></div>
      <header className="d5-header">
        <h1><Editable path="firstName" /> <Editable path="lastName" /></h1>
        <div className="d5-role"><Editable path="role" /></div>
        <div className="d5-divider"></div>
        <div className="d5-contact">
          <div><Editable as="span" className="d5-label" path="labels.contactLabels.phone" /><Editable path="contact.phone" /></div>
          <div><Editable as="span" className="d5-label" path="labels.contactLabels.email" /><Editable path="contact.email" /></div>
          <div><Editable as="span" className="d5-label" path="labels.contactLabels.location" /><Editable path="contact.location" /></div>
          <div><Editable as="span" className="d5-label" path="labels.contactLabels.status" /><Editable path="contact.maritalStatus" /></div>
          <div><Editable as="span" className="d5-label" path="labels.contactLabels.origin" /><Editable path="contact.birthInfo" /></div>
        </div>
      </header>

      <div className="d5-body">
        <section className="d5-section">
          <h2><Editable path="labels.profile" /></h2>
          <div className="d5-content">
            {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
          </div>
        </section>

        <section className="d5-section">
          <h2><Editable path="labels.education" /></h2>
          <div className="d5-content">
            {d.education.map((e, i) => (
              <div className="d5-entry" key={i}>
                <div className="d5-entry-date"><Editable path={`education.${i}.date`} /></div>
                <div className="d5-entry-body">
                  <div className="d5-entry-title"><Editable path={`education.${i}.place`} />{' '}<Editable path={`education.${i}.details`} /></div>
                  {e.bullets.length > 0 && <ul>{e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}</ul>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="d5-section">
          <h2><Editable path="labels.workExperience" /></h2>
          <div className="d5-content">
            <ul className="d5-plain">{d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}</ul>
          </div>
        </section>

        <section className="d5-section">
          <h2><Editable path="labels.militaryService" /></h2>
          <div className="d5-content">
            {d.military.map((j, i) => (
              <div className="d5-entry" key={i}>
                <div className="d5-entry-date"><Editable path={`military.${i}.date`} /></div>
                <div className="d5-entry-body">
                  <div className="d5-entry-title"><Editable path={`military.${i}.title`} /></div>
                  <ul>{j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}</ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="d5-bottom-grid">
          <section className="d5-bottom-section">
            <h2><Editable path="labels.strengths" /></h2>
            <ul className="d5-plain">{d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}</ul>
          </section>
          <section className="d5-bottom-section d5-bottom-split">
            <div>
              <h2><Editable path="labels.languages" /></h2>
              <ul className="d5-plain">{d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}</ul>
            </div>
            <div>
              <h2><Editable path="labels.futurePlans" /></h2>
              <ul className="d5-plain">{d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}</ul>
            </div>
          </section>

          <section className="d5-bottom-section">
            <h2><Editable path="labels.volunteering" /></h2>
            <ul className="d5-plain">{d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
