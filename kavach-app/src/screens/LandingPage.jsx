import { Link } from 'react-router-dom';
import { Languages, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useT, LANGUAGES } from '../i18n';
import { Card, Logo, Stepper, TypeIcon } from '../components/ui';
import { APP_NAME, APP_VERSION, roleHome } from '../config/society';
import '../styles/landing.css';

// Facts and links come only from docs/problem-evidence.md
const STATS = [
  { id: 1, type: 'lift', source: 'Deccan Herald', href: 'https://deccanherald.com/india/karnataka/bengaluru/four-in-10-bengalureans-dread-stepping-into-a-lift-survey-4098155' },
  { id: 2, type: 'power', source: 'DT Next', href: 'https://www.dtnext.in/news/chennai/cpm-seeks-action-against-lift-contractor-of-kp-park-over-recent-fatality-793036' },
  { id: 3, type: 'power', source: 'South First', href: 'https://thesouthfirst.com/news/as-parts-of-chennai-remain-inundated-residents-still-struggle-with-power-outages-toll-rises-to-18' },
  { id: 4, type: 'lift', source: 'Siasat', href: 'https://www.siasat.com/6-yr-old-falls-between-lift-wall-at-hyderabad-apartments-rescued-3183807/amp/' },
];

const STEPS = [1, 2, 3];

const FEATURES = ['Lift', 'Safety', 'Power', 'Compliance', 'Offline', 'Lang'];
const AUDIENCE = ['Residents', 'Staff', 'Committee'];

function IconTile({ icon: Icon, tone, small }) {
  return (
    <span className={`type-icon${small ? ' type-icon--sm' : ''}`} style={{ '--tone': tone }} aria-hidden="true">
      <Icon size={small ? 18 : 22} />
    </span>
  );
}

export default function LandingPage() {
  const { user, profile } = useAuth();
  const { t, lang, setLang } = useT();

  const signedIn = !!(user && profile);
  const appTarget = signedIn ? roleHome(profile.role) : '/login';
  const nextLang = LANGUAGES.find(l => l.code !== lang) || LANGUAGES[0];

  const previewSteps = [
    { label: t('common.status_pending'), state: 'done' },
    { label: t('common.status_acknowledged'), state: 'done' },
    { label: t('common.status_en_route'), state: 'current' },
    { label: t('common.status_on_scene'), state: 'todo' },
  ];

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__wrap landing__bar">
          <Link to="/" className="landing__brand" aria-label={t('landing.homeLink')}>
            <Logo size={30} title={APP_NAME} />
            <span>{APP_NAME}</span>
          </Link>
          <div className="landing__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setLang(nextLang.code)}
              aria-label={`${t('common.language')}: ${nextLang.label}`}
            >
              <Languages size={18} aria-hidden="true" />
              <span lang={nextLang.code}>{nextLang.label}</span>
            </button>
            <Link to={appTarget} className="btn btn--secondary btn--sm">
              {signedIn ? t('landing.openApp') : t('landing.signIn')}
            </Link>
          </div>
        </div>
      </header>

      <main className="landing__wrap">
        {/* a) Hero */}
        <section className="landing__hero" aria-labelledby="landing-title">
          <div className="landing__hero-text">
            <h1 id="landing-title" className="landing__h1">{t('landing.heroTitle')}</h1>
            <p className="landing__lead">{t('landing.heroSub')}</p>
            <div className="landing__ctas">
              <Link to={appTarget} className="btn btn--primary btn--lg">
                {signedIn ? t('landing.openApp') : t('landing.getStarted')}
              </Link>
              <a href="#how" className="btn btn--ghost btn--lg">{t('landing.heroSecondary')}</a>
            </div>
          </div>

          <Card className="landing__preview" role="group" aria-label={t('landing.previewLabel')}>
            <p className="landing__preview-label" aria-hidden="true">{t('landing.previewLabel')}</p>
            <div className="landing__preview-head">
              <TypeIcon type="lift" size="lg" />
              <div>
                <p className="landing__preview-title">{t('common.type_lift')}</p>
                <p className="landing__preview-meta">{t('landing.previewWhere')}</p>
              </div>
            </div>
            <Stepper steps={previewSteps} />
            <p className="landing__preview-who">
              <IconTile icon={Wrench} tone="var(--orange)" small />
              {t('landing.previewWho')}
            </p>
          </Card>
        </section>

        {/* b) The problem: plain list, figure in a column, source under the text */}
        <section id="problem" className="landing__section" aria-labelledby="problem-title">
          <div className="landing__section-head">
            <h2 id="problem-title" className="landing__h2">{t('landing.problemTitle')}</h2>
            <p className="landing__intro">{t('landing.problemIntro')}</p>
          </div>
          <ul className="card settings-group landing-facts">
            {STATS.map(s => (
              <li key={s.id} className="landing-fact">
                <p className="landing-fact__value">{t(`landing.stat${s.id}Value`)}</p>
                <div className="landing-fact__body">
                  <p className="landing-fact__text">{t(`landing.stat${s.id}Text`)}</p>
                  <p className="landing-fact__meta">
                    {t(`landing.stat${s.id}Place`)}
                    {' · '}
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.source}
                      <span className="sr-only"> {t('landing.opensNewTab')}</span>
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="landing__intro landing__outro">{t('landing.problemOutro')}</p>
        </section>

        {/* c) How it works */}
        <section id="how" className="landing__section" aria-labelledby="how-title">
          <div className="landing__section-head">
            <h2 id="how-title" className="landing__h2">{t('landing.howTitle')}</h2>
          </div>
          <ol className="landing-steps">
            {STEPS.map(n => (
              <li key={n} className="landing-step">
                <h3 className="landing-step__title">{t(`landing.step${n}Title`)}</h3>
                <p className="landing-step__text">{t(`landing.step${n}Text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* d) What it does */}
        <section id="features" className="landing__section" aria-labelledby="features-title">
          <div className="landing__section-head">
            <h2 id="features-title" className="landing__h2">{t('landing.featuresTitle')}</h2>
          </div>
          <ul className="card settings-group landing-list">
            {FEATURES.map(id => (
              <li key={id} className="landing-list__row">
                <h3 className="landing-list__title">{t(`landing.feat${id}Title`)}</h3>
                <p className="landing-list__text">{t(`landing.feat${id}Text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* e) Built for */}
        <section id="audience" className="landing__section" aria-labelledby="audience-title">
          <div className="landing__section-head">
            <h2 id="audience-title" className="landing__h2">{t('landing.builtTitle')}</h2>
          </div>
          <ul className="card settings-group landing-list">
            {AUDIENCE.map(id => (
              <li key={id} className="landing-list__row">
                <h3 className="landing-list__title">{t(`landing.built${id}Title`)}</h3>
                <p className="landing-list__text">{t(`landing.built${id}Text`)}</p>
              </li>
            ))}
          </ul>
          <div className="landing__ctas landing__end">
            <Link to={appTarget} className="btn btn--primary btn--lg">
              {signedIn ? t('landing.openApp') : t('landing.getStarted')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__wrap landing__footer-inner">
          <p className="landing__footer-brand">
            <Logo size={20} title={APP_NAME} />
            {APP_NAME}
          </p>
          <p className="landing__small">{t('landing.smallPrint')}</p>
          <p>{t('common.version', { v: APP_VERSION })}</p>
        </div>
      </footer>
    </div>
  );
}
