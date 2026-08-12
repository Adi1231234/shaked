import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import './Design6Editorial.css';

export default function Design6Editorial() {
  const d = useCv();
  const lang = useLang();
  return (
    <div className="d6-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="d6-header">
        <div className="d6-header-left">
          <div className="d6-eyebrow"><Editable path="labels.curriculumVitae" /></div>
          <h1><Editable path="firstName" /> <Editable path="lastName" /></h1>
          <div className="d6-role"><Editable path="role" /></div>
        </div>
        <div className="d6-header-right">
          <div className="d6-contact-item"><span>T</span><Editable path="contact.phone" /></div>
          <div className="d6-contact-item"><span>E</span><Editable path="contact.email" /></div>
          <div className="d6-contact-item"><span>A</span><Editable path="contact.location" /></div>
          <div className="d6-contact-item"><span>S</span><Editable path="contact.maritalStatus" /></div>
          <div className="d6-contact-item"><span>B</span><Editable path="contact.birthInfo" /></div>
        </div>
      </header>

      <section className="d6-profile-section">
        <div className="d6-section-num">01</div>
        <div className="d6-section-title"><Editable path="labels.profile" /></div>
        <div className="d6-profile-body">
          {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
        </div>
      </section>

      <div className="d6-two-cols">
        <div className="d6-col-left">
          <section className="d6-section">
            <div className="d6-section-num">02</div>
            <div className="d6-section-title"><Editable path="labels.education" /></div>
            {d.education.map((e, i) => (
              <div className="d6-entry" key={i}>
                <div className="d6-entry-date"><Editable path={`education.${i}.date`} /></div>
                <div className="d6-entry-title"><Editable path={`education.${i}.place`} />{' '}<Editable path={`education.${i}.details`} /></div>
                {e.bullets.length > 0 && (
                  <ul>{e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}</ul>
                )}
              </div>
            ))}
          </section>

          <section className="d6-section">
            <div className="d6-section-num">03</div>
            <div className="d6-section-title"><Editable path="labels.workExperience" /></div>
            <ul className="d6-plain">{d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}</ul>
          </section>

          <section className="d6-section">
            <div className="d6-section-num">04</div>
            <div className="d6-section-title"><Editable path="labels.militaryService" /></div>
            {d.military.map((j, i) => (
              <div className="d6-entry" key={i}>
                <div className="d6-entry-date"><Editable path={`military.${i}.date`} /></div>
                <div className="d6-entry-title"><Editable path={`military.${i}.title`} /></div>
                <ul>{j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}</ul>
              </div>
            ))}
          </section>
        </div>

        <div className="d6-col-right">
          <section className="d6-section">
            <div className="d6-section-num">05</div>
            <div className="d6-section-title"><Editable path="labels.strengths" /></div>
            <ul className="d6-plain">{d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}</ul>
          </section>

          <section className="d6-section">
            <div className="d6-section-num">06</div>
            <div className="d6-section-title"><Editable path="labels.languages" /></div>
            <ul className="d6-plain">{d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}</ul>
          </section>

          <section className="d6-section">
            <div className="d6-section-num">07</div>
            <div className="d6-section-title"><Editable path="labels.futurePlans" /></div>
            <ul className="d6-plain">{d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}</ul>
          </section>

          <section className="d6-section">
            <div className="d6-section-num">08</div>
            <div className="d6-section-title"><Editable path="labels.volunteering" /></div>
            <ul className="d6-plain">{d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
