/**
 * EduSchedule Pro - Page de connexion Premium
 * Design académique haut de gamme — ISGE Burkina Faso
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { FaEye, FaEyeSlash, FaLock, FaEnvelope, FaGraduationCap } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import isgePhoto from '../assets/isge-students.jpeg';

const DEMO_ACCOUNTS = [
  { role: 'Admin',       email: 'admin@eduschedule.pro',  password: 'password', color: '#6366f1' },
  { role: 'Enseignant',  email: 'cedric.bere@isge.edu',   password: 'password', color: '#0ea5e9' },
  { role: 'Délégué',     email: 'delegue.l1@isge.edu',    password: 'password', color: '#10b981' },
  { role: 'Surveillant', email: 'surveillant@isge.edu',   password: 'password', color: '#f59e0b' },
  { role: 'Comptable',   email: 'comptable@isge.edu',     password: 'password', color: '#ec4899' },
  { role: 'Étudiant',   email: 'etudiant@isge.edu',      password: 'password', color: '#f97316' },
];

const S = {
  page: {
    display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif",
    background: '#0f172a', overflow: 'hidden',
  },
  // ── Panneau gauche : photo ──
  left: {
    flex: '1 1 55%', position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'flex-end',
  },
  photo: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center top',
  },
  photoOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.2) 40%, rgba(15,23,42,0.85) 100%)',
  },
  leftContent: {
    position: 'relative', zIndex: 2, padding: '48px 52px', width: '100%',
  },
  schoolBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50,
    padding: '8px 20px', marginBottom: 28,
  },
  schoolBadgeDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
    boxShadow: '0 0 8px #4ade80',
  },
  schoolBadgeText: {
    color: '#fff', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff', fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', fontWeight: 800,
    lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em',
    textShadow: '0 2px 24px rgba(0,0,0,0.4)',
  },
  heroAccent: {
    background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.6,
    maxWidth: 420, marginBottom: 40,
  },
  statsRow: {
    display: 'flex', gap: 32,
  },
  stat: {
    display: 'flex', flexDirection: 'column',
  },
  statNum: {
    color: '#fff', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginTop: 4,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  // ── Panneau droit : formulaire ──
  right: {
    flex: '0 0 420px', background: '#0f172a', display: 'flex',
    flexDirection: 'column', justifyContent: 'center', padding: '48px 44px',
    position: 'relative', zIndex: 1,
    borderLeft: '1px solid rgba(255,255,255,0.06)',
  },
  rightBg: {
    position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
  },
  rightGlow: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
    top: -100, right: -100,
  },
  rightGlow2: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
    bottom: -80, left: -80,
  },
  // Logo
  logoArea: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40,
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '1.2rem', flexShrink: 0,
    boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
  },
  logoText: {
    display: 'flex', flexDirection: 'column',
  },
  logoName: {
    color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, lineHeight: 1.2,
  },
  logoSub: {
    color: '#64748b', fontSize: '0.72rem', letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  // Titre formulaire
  formTitle: {
    color: '#f1f5f9', fontSize: '1.8rem', fontWeight: 700,
    marginBottom: 6, letterSpacing: '-0.02em',
  },
  formSub: {
    color: '#64748b', fontSize: '0.88rem', marginBottom: 32,
  },
  // Champ
  fieldWrap: {
    marginBottom: 16, position: 'relative',
  },
  fieldLabel: {
    display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600,
    marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  fieldInner: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute', left: 14, color: '#475569', fontSize: '0.9rem', pointerEvents: 'none',
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
    color: '#f1f5f9', fontSize: '0.92rem', padding: '13px 14px 13px 40px',
    outline: 'none', transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  inputFocused: {
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.5)',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.12)',
  },
  eyeBtn: {
    position: 'absolute', right: 14, background: 'none', border: 'none',
    color: '#475569', cursor: 'pointer', padding: 4, display: 'flex',
    alignItems: 'center', fontSize: '0.95rem',
  },
  // Erreur
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
    color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
  },
  // Bouton submit
  submitBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
    color: '#fff', fontSize: '0.95rem', fontWeight: 700,
    cursor: 'pointer', marginTop: 8, marginBottom: 28,
    transition: 'all 0.2s', letterSpacing: '0.02em',
    boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6, cursor: 'not-allowed',
  },
  // Démos
  demoSep: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  demoLine: {
    flex: 1, height: 1, background: 'rgba(255,255,255,0.07)',
  },
  demoText: {
    color: '#475569', fontSize: '0.75rem', letterSpacing: '0.05em',
    textTransform: 'uppercase', whiteSpace: 'nowrap',
  },
  demoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
  },
  demoChip: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '8px 6px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    transition: 'all 0.15s', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600,
  },
  demoChipActive: {
    border: '1px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.1)',
    color: '#a5b4fc',
  },
  demoDot: {
    width: 7, height: 7, borderRadius: '50%',
  },
  // Footer
  formFooter: {
    marginTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 20, color: '#475569', fontSize: '0.75rem', textAlign: 'center',
  },
};

const LoginPage = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);
  const [showPwd, setShowPwd]       = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPwd, setFocusPwd]     = useState(false);
  const [time, setTime]             = useState(new Date());
  const [mounted, setMounted]       = useState(false);

  const { login, isAuthenticated, getDashboardPath } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const fromPath  = location.state?.from?.pathname || '';
  const from      = fromPath.startsWith('/pointage')
    ? fromPath + (location.state?.from?.search || '') : null;

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isAuthenticated) return <Navigate to={from || getDashboardPath()} replace />;

  const fillDemo = (acc, i) => {
    setEmail(acc.email); setPassword(acc.password);
    setActiveDemo(i); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) navigate(from || getDashboardPath(), { replace: true });
      else setError(res.message || 'Identifiants incorrects');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
    } finally { setLoading(false); }
  };

  const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ ...S.page, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s' }}>
      <style>{`
        @media (max-width: 768px) {
          .login-left  { display: none !important; }
          .login-right {
            flex: 1 1 100% !important;
            padding: 32px 24px !important;
            min-height: 100vh;
            background: #0f172a !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .login-left  { flex: 1 1 45% !important; }
          .login-right { flex: 0 0 360px !important; padding: 36px 28px !important; }
        }
        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(99,102,241,0.5) !important;
        }
        .login-chip:hover { background: rgba(255,255,255,0.08) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #1e293b inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
        }
      `}</style>

      {/* ══ PANNEAU GAUCHE : PHOTO ══ */}
      <div className="login-left" style={S.left}>
        <img src={isgePhoto} alt="ISGE étudiants" style={S.photo} />
        <div style={S.photoOverlay} />

        {/* Horloge en haut à droite de la photo */}
        <div style={{
          position: 'absolute', top: 28, right: 28, textAlign: 'right', zIndex: 3,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
          borderRadius: 12, padding: '10px 18px', border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>{timeStr}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', marginTop: 4, textTransform: 'capitalize' }}>{dateStr}</div>
        </div>

        <div style={S.leftContent}>
          {/* Badge école */}
          <div style={S.schoolBadge}>
            <div style={S.schoolBadgeDot} />
            <span style={S.schoolBadgeText}>ISGE Burkina Faso · Ouagadougou</span>
          </div>

          <h1 style={S.heroTitle}>
            Le temps,<br />
            <span style={S.heroAccent}>parfaitement</span><br />
            orchestré.
          </h1>

          <p style={S.heroSub}>
            Système de gestion intelligent des emplois du temps,
            pointages et vacations pour l'enseignement supérieur.
          </p>

          {/* Stats */}
          <div style={S.statsRow}>
            {[
              { num: '500+', label: 'Étudiants' },
              { num: '30+',  label: 'Enseignants' },
              { num: '100%', label: 'Numérique' },
            ].map((s, i) => (
              <div key={i} style={S.stat}>
                <span style={S.statNum}>{s.num}</span>
                <span style={S.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ PANNEAU DROIT : FORMULAIRE ══ */}
      <div className="login-right" style={S.right}>
        <div style={S.rightBg}>
          <div style={S.rightGlow} />
          <div style={S.rightGlow2} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={S.logoArea}>
            <div style={S.logoIcon}><FaGraduationCap /></div>
            <div style={S.logoText}>
              <span style={S.logoName}>EduSchedule Pro</span>
              <span style={S.logoSub}>Plateforme académique</span>
            </div>
          </div>

          {/* Titre */}
          <h2 style={S.formTitle}>Connexion</h2>
          <p style={S.formSub}>Accédez à votre espace de travail</p>

          {/* Erreur */}
          {error && (
            <div style={S.errorBox}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>Adresse email</label>
              <div style={S.fieldInner}>
                <FaEnvelope style={S.fieldIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setActiveDemo(null); }}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  required autoFocus autoComplete="email"
                  placeholder="votre@email.com"
                  style={{ ...S.input, ...(focusEmail ? S.inputFocused : {}) }}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>Mot de passe</label>
              <div style={S.fieldInner}>
                <FaLock style={S.fieldIcon} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setActiveDemo(null); }}
                  onFocus={() => setFocusPwd(true)}
                  onBlur={() => setFocusPwd(false)}
                  required autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...S.input, ...(focusPwd ? S.inputFocused : {}), paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={S.eyeBtn}
                  tabIndex={-1}
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading
                ? <><Spinner animation="border" size="sm" /> Connexion en cours…</>
                : <>Se connecter →</>}
            </button>
          </form>

          {/* Comptes démo */}
          <div style={S.demoSep}>
            <div style={S.demoLine} />
            <span style={S.demoText}>Comptes démo</span>
            <div style={S.demoLine} />
          </div>

          <div style={S.demoGrid}>
            {DEMO_ACCOUNTS.map((acc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => fillDemo(acc, i)}
                style={{
                  ...S.demoChip,
                  ...(activeDemo === i ? { ...S.demoChipActive, borderColor: acc.color + '80', background: acc.color + '18', color: acc.color } : {}),
                }}
                onMouseEnter={e => activeDemo !== i && (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => activeDemo !== i && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                <div style={{ ...S.demoDot, background: acc.color, boxShadow: activeDemo === i ? `0 0 8px ${acc.color}` : 'none' }} />
                {acc.role}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={S.formFooter}>
            © {new Date().getFullYear()} EduSchedule Pro · ISGE Burkina Faso<br />
            <span style={{ color: '#334155' }}>Assistance : traorerayan18@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
