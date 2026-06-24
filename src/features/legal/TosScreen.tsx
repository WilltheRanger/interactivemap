import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components';
import { getTosAccepted, subscribeTos } from '../../lib/tos';
import './Tos.css';

/** Plain-English Terms of Service. Order + substance match the required points 1–7. */
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. What this app is',
    body: 'DBHS Wayfinder is a student-built tool to help you find your way around campus. It is not an official Diamond Bar High School or Walnut Valley Unified School District product, and it is not endorsed by them unless we clearly say so.',
  },
  {
    heading: '2. Information may not be current',
    body: 'The map, room assignments, locker locations, and bell schedules are provided as-is and may not be up to date. This app is not a substitute for official school communications. Always treat what you hear from teachers, counselors, the front office, or the district as the real source of truth.',
  },
  {
    heading: '3. 4-Year Plan & credit tracker',
    body: 'The 4-Year Plan and credit tracker are for planning purposes only. They are not official academic advice. Credit requirements can change, so always verify with your counselor before making any decisions about your classes or graduation.',
  },
  {
    heading: '4. AI chatbot',
    body: 'If the app includes an AI chatbot, its responses may be inaccurate or incomplete, and it is not an official school resource. Always double-check important information with a teacher, counselor, or administrator before acting on it.',
  },
  {
    heading: '5. Your privacy',
    body: 'Your schedule and locker number are stored locally on this device only, in your browser. No personal information is collected or stored by the app.',
  },
  {
    heading: '6. No guarantee it always works',
    body: 'The app may be unavailable at times or contain outdated information. The developer is not responsible for any decisions you make based on the app’s content — use your own judgment and confirm important details with the school.',
  },
  {
    heading: '7. Changes to these terms',
    body: 'These terms may be updated from time to time. If you keep using the app after they change, that means you accept the updated terms.',
  },
];

export function TosScreen() {
  const navigate = useNavigate();
  // While the first-launch banner is still up it floats over the bottom of this page, so add
  // clearance under the last section; once accepted the padding returns to normal.
  const accepted = useSyncExternalStore(subscribeTos, getTosAccepted, getTosAccepted);

  return (
    <section className={`screen tos${accepted ? '' : ' tos--banner'}`} aria-labelledby="tos-title">
      <div className="tos__back">
        <Button
          variant="secondary"
          icon={<ArrowLeft size={16} />}
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/map'))}
        >
          Back
        </Button>
      </div>
      <h1 id="tos-title" className="screen__title">
        Terms of Service
      </h1>
      <p className="screen__sub">
        Please read this before using DBHS Wayfinder. Using the app means you agree to these terms.
        It takes about two minutes.
      </p>
      <div className="screen__body tos__body">
        {SECTIONS.map((section) => (
          <section key={section.heading} className="tos__section">
            <h2 className="tos__heading">{section.heading}</h2>
            <p className="tos__text">{section.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
