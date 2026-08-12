import { useCv, useLang } from '../CvContext';
import { Editable } from '../Editable';
import { IconPhone, IconMail, IconPin, IconUser, IconCalendar } from './Icons';
import './Design1Classic.css';

export type ClassicTheme = 'navy' | 'emerald' | 'burgundy' | 'slate';

export default function Design1Classic({ theme = 'navy' }: { theme?: ClassicTheme }) {
  const d = useCv();
  const lang = useLang();
  return (
    <div className={`d1-page d1-theme-${theme}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <aside className="d1-sidebar">
        <div className="d1-name-block">
          <div className="d1-name"><Editable path="firstName" /> <Editable path="lastName" /></div>
          <div className="d1-role"><Editable path="role" /></div>
        </div>

        <section>
          <h2><Editable path="labels.contact" /></h2>
          <div className="d1-contact-list">
            <div className="d1-contact-row"><span className="d1-ico"><IconPhone /></span><Editable path="contact.phone" /></div>
            <div className="d1-contact-row"><span className="d1-ico"><IconMail /></span><Editable path="contact.email" /></div>
            <div className="d1-contact-row"><span className="d1-ico"><IconPin /></span><Editable path="contact.location" /></div>
            <div className="d1-contact-row"><span className="d1-ico"><IconUser /></span><Editable path="contact.maritalStatus" /></div>
            <div className="d1-contact-row"><span className="d1-ico"><IconCalendar /></span><Editable path="contact.birthInfo" /></div>
          </div>
        </section>

        <section>
          <h2><Editable path="labels.languages" /></h2>
          <ul className="d1-sidebar-list d1-lang-list">
            {d.languages.map((_, i) => <li key={i}><Editable path={`languages.${i}`} /></li>)}
          </ul>
        </section>

        <section>
          <h2><Editable path="labels.strengths" /></h2>
          <ul className="d1-sidebar-list">
            {d.strengths.map((_, i) => <li key={i}><Editable path={`strengths.${i}`} /></li>)}
          </ul>
        </section>

        <section>
          <h2><Editable path="labels.futurePlans" /></h2>
          <ul className="d1-sidebar-list">
            {d.futurePlants.map((_, i) => <li key={i}><Editable path={`futurePlants.${i}`} /></li>)}
          </ul>
        </section>
      </aside>

      <main className="d1-main">
        <section className="d1-profile">
          <h2><span className="d1-bullet"></span><Editable path="labels.profile" /></h2>
          {d.profile.paragraphs.map((_, i) => <p key={i}><Editable path={`profile.paragraphs.${i}`} /></p>)}
        </section>

        <section>
          <h2><span className="d1-bullet"></span><Editable path="labels.education" /></h2>
          {d.education.map((e, i) => (
            <div className="d1-edu-item" key={i}>
              <Editable as="span" className="d1-edu-date" path={`education.${i}.date`} />
              {' '}
              <Editable as="span" className="d1-edu-place" path={`education.${i}.place`} />
              {' '}
              <Editable path={`education.${i}.details`} />
              {e.bullets.length > 0 && (
                <ul className="d1-bullet-list">
                  {e.bullets.map((_, bi) => <li key={bi}><Editable path={`education.${i}.bullets.${bi}`} /></li>)}
                </ul>
              )}
            </div>
          ))}
        </section>

        <section>
          <h2><span className="d1-bullet"></span><Editable path="labels.workExperience" /></h2>
          <ul className="d1-bullet-list">
            {d.workExperience.map((_, i) => <li key={i}><Editable path={`workExperience.${i}`} /></li>)}
          </ul>
        </section>

        <section>
          <h2><span className="d1-bullet"></span><Editable path="labels.militaryService" /></h2>
          {d.military.map((j, i) => (
            <div className="d1-job" key={i}>
              <div className="d1-job-head">
                <Editable as="span" className="d1-job-title" path={`military.${i}.title`} />
                <Editable as="span" className="d1-job-date" path={`military.${i}.date`} />
              </div>
              <ul className="d1-bullet-list">
                {j.bullets.map((_, bi) => <li key={bi}><Editable path={`military.${i}.bullets.${bi}`} /></li>)}
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h2><span className="d1-bullet"></span><Editable path="labels.volunteering" /></h2>
          <ul className="d1-bullet-list">
            {d.volunteering.map((_, i) => <li key={i}><Editable path={`volunteering.${i}`} /></li>)}
          </ul>
        </section>
      </main>
    </div>
  );
}
