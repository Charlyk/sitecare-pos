import { useState } from 'react';
import { useT } from './i18n.jsx';
import { Icon } from './icons.jsx';
import './login.css';

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         style={{ animation: 'spin 900ms linear infinite' }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function LoginScreen({ lang, onLangChange, onSubmit, onForgotPassword, busy, error }) {
  const t = useT(lang);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);

  const canSubmit = isValidEmail(email) && pass !== '' && !busy;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    onSubmit(email, pass, remember);
  };

  return (
    <div className="login-body">
      {/* Brand panel */}
      <div className="brand-panel">
        <div className="arc" />
        <div className="arc2" />

        <div className="brand-top">
          <div className="brand-logo">S</div>
          <div>
            <div className="brand-name"><span>Site</span><b>Care</b></div>
            <div className="brand-sub">POS</div>
          </div>
        </div>

        <div className="brand-hero">
          <div className="brand-eyebrow">{t('login_brand_eyebrow')}</div>
          <h1 className="brand-title">
            {t('login_brand_title_a')}<br />
            <em>{t('login_brand_title_b')}</em>
          </h1>
          <p className="brand-lead">{t('login_brand_lead')}</p>

          <div className="brand-stats">
            <div className="brand-stat">
              <div className="n">1.4M+</div>
              <div className="l">{t('login_stat_orders')}</div>
            </div>
            <div className="brand-stat">
              <div className="n">320</div>
              <div className="l">{t('login_stat_rest')}</div>
            </div>
            <div className="brand-stat">
              <div className="n">99.97%</div>
              <div className="l">{t('login_stat_uptime')}</div>
            </div>
          </div>
        </div>

        <div className="receipt-card">
          <div className="receipt-hdr">
            <div className="id">#1047</div>
            <div className="tm">{t('login_receipt_time')}</div>
          </div>
          <div className="receipt-row">
            <span className="n">2× {t('login_r_item1')}</span>
            <span className="p">42,00</span>
          </div>
          <div className="receipt-row">
            <span className="n">1× {t('login_r_item2')}</span>
            <span className="p">28,00</span>
          </div>
          <div className="receipt-row">
            <span className="n">1× {t('login_r_item3')}</span>
            <span className="p">22,00</span>
          </div>
          <div className="receipt-total">
            <span>{t('login_r_total')}</span>
            <span>92,00 lei</span>
          </div>
          <div className="receipt-stamp">{t('login_stamp')}</div>
        </div>

        <div className="brand-foot">
          <div>
            <span className="online-dot" />
            SiteCare Cloud · eu-central
          </div>
          <div className="links">
            <a href="#" onClick={(e) => e.preventDefault()}>{t('login_terms')}</a>
            <a href="#" onClick={(e) => e.preventDefault()}>{t('login_privacy')}</a>
            <a href="#" onClick={(e) => e.preventDefault()}>{t('login_support')}</a>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="form-panel">
        <div className="form-top">
          <div className="status-pill">
            <span className="d" />
            {t('login_online')}
          </div>
          <div className="lang-seg">
            <button
              className={lang === 'ro' ? 'on' : ''}
              onClick={() => onLangChange('ro')}
            >
              RO
            </button>
            <button
              className={lang === 'en' ? 'on' : ''}
              onClick={() => onLangChange('en')}
            >
              EN
            </button>
          </div>
        </div>

        <form className="form-wrap" onSubmit={handleSubmit}>
          <div className="welcome-eyebrow">{t('login_welcome_eyebrow')}</div>
          <h2 className="welcome-title">{t('login_title')}</h2>
          <p className="welcome-sub">{t('login_sub')}</p>

          {/* Email field */}
          <div className="field">
            <label>{t('login_email_label')}</label>
            <div className={`field-input${error === 'email' || error === 'creds' ? ' err' : ''}`}>
              <span className="ico"><Icon name="users" size={16} /></span>
              <input
                type="email"
                autoComplete="email"
                placeholder={t('login_email_ph')}
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error === 'email' && (
              <div className="field-error">
                <Icon name="alert" size={12} /> {t('login_err_email')}
              </div>
            )}
          </div>

          {/* Password field */}
          <div className="field">
            <label>
              {t('login_pass_label')}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onForgotPassword(); }}
              >
                {t('login_forgot')}
              </a>
            </label>
            <div className={`field-input${error === 'pass' || error === 'creds' ? ' err' : ''}`}>
              <span className="ico"><Icon name="settings" size={16} /></span>
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t('login_pass_ph')}
                value={pass}
                disabled={busy}
                onChange={(e) => setPass(e.target.value)}
              />
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPass(!showPass)}
                title={showPass ? t('login_hide_pass') : t('login_show_pass')}
              >
                <Icon name={showPass ? 'x' : 'search'} size={15} />
              </button>
            </div>
            {(error === 'creds' || error === 'pass') && (
              <div className="field-error">
                <Icon name="alert" size={12} /> {t('login_err_creds')}
              </div>
            )}
          </div>

          <div className="field-row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t('login_remember')}
            </label>
          </div>

          <button type="submit" className="primary-btn" disabled={!canSubmit}>
            {busy ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Spinner /> {t('login_btn_busy')}
              </span>
            ) : (
              <>
                <Icon name="check" size={16} /> {t('login_btn_idle')}
              </>
            )}
          </button>

          <div className="divider">{t('login_or')}</div>

          <button
            type="button"
            className="alt-btn"
            style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}
          >
            <Icon name="wifi" size={15} /> {t('login_sso')}
          </button>

          <div className="form-foot">
            <span>{'v' + (import.meta.env.VITE_APP_VERSION || '0.1.0')}</span>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onForgotPassword(); }}
              style={{ color: 'var(--sc-primary)', textDecoration: 'none', fontWeight: 600 }}
            >
              {t('login_forgot')}
            </a>
          </div>
        </form>

        <div className="signature">
          {t('login_signed')} <b>♥</b> {t('login_heart')}
        </div>
      </div>
    </div>
  );
}
