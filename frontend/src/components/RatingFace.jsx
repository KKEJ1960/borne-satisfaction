export default function RatingFace({ value }) {
  if (value === 1) return (
    <svg viewBox="0 0 80 80" width="72" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* visage */}
      <circle cx="40" cy="40" r="38" fill="#fee2e2"/>
      {/* sourcils tristes — coins intérieurs hauts */}
      <path d="M18 24 Q24 19 29 25" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M51 25 Q56 19 62 24" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round"/>
      {/* yeux avec paupière tombante */}
      <circle cx="26" cy="36" r="5.5" fill="#dc2626"/>
      <circle cx="54" cy="36" r="5.5" fill="#dc2626"/>
      <path d="M20.5 36 Q26 43 31.5 36" fill="#fee2e2"/>
      <path d="M48.5 36 Q54 43 59.5 36" fill="#fee2e2"/>
      {/* pupilles */}
      <circle cx="26" cy="34" r="2" fill="#fff"/>
      <circle cx="54" cy="34" r="2" fill="#fff"/>
      {/* grimace */}
      <path d="M22 61 Q40 51 58 61" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round"/>
      {/* larme */}
      <path d="M55 41 C53 46 53 50 55 52 C57 50 57 46 55 41Z" fill="#fca5a5"/>
    </svg>
  );

  if (value === 2) return (
    <svg viewBox="0 0 80 80" width="72" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* visage */}
      <circle cx="40" cy="40" r="38" fill="#fef3c7"/>
      {/* sourcils plats */}
      <line x1="19" y1="26" x2="33" y2="26" stroke="#d97706" strokeWidth="2.8" strokeLinecap="round"/>
      <line x1="47" y1="26" x2="61" y2="26" stroke="#d97706" strokeWidth="2.8" strokeLinecap="round"/>
      {/* yeux mi-clos (paupière à mi-hauteur) */}
      <circle cx="26" cy="37" r="5.5" fill="#d97706"/>
      <circle cx="54" cy="37" r="5.5" fill="#d97706"/>
      <rect x="20.5" y="31.5" width="11" height="5.5" rx="0" fill="#fef3c7"/>
      <rect x="48.5" y="31.5" width="11" height="5.5" rx="0" fill="#fef3c7"/>
      {/* pupilles */}
      <circle cx="26" cy="38" r="2" fill="#fff"/>
      <circle cx="54" cy="38" r="2" fill="#fff"/>
      {/* bouche neutre légèrement haussée d'un côté */}
      <path d="M25 57 Q40 57 55 55" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  );

  if (value === 3) return (
    <svg viewBox="0 0 80 80" width="72" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* visage */}
      <circle cx="40" cy="40" r="38" fill="#dcfce7"/>
      {/* sourcils heureux */}
      <path d="M18 26 Q26 20 33 26" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      <path d="M47 26 Q54 20 62 26" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      {/* yeux plissés de joie */}
      <path d="M20 36 Q26 29 32 36" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M48 36 Q54 29 60 36" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round"/>
      {/* grand sourire */}
      <path d="M18 52 Q40 70 62 52" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* joues */}
      <circle cx="17" cy="47" r="7" fill="#bbf7d0" opacity="0.75"/>
      <circle cx="63" cy="47" r="7" fill="#bbf7d0" opacity="0.75"/>
    </svg>
  );

  if (value === 4) return (
    <svg viewBox="0 0 80 80" width="72" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* visage */}
      <circle cx="40" cy="40" r="38" fill="#ede9fe"/>
      {/* yeux en étoile */}
      <path d="M26 27 L27.8 31.6 L32.7 31.8 L28.9 35 L30.5 39.7 L26 37 L21.5 39.7 L23.1 35 L19.3 31.8 L24.2 31.6 Z" fill="#7c3aed"/>
      <path d="M54 27 L55.8 31.6 L60.7 31.8 L56.9 35 L58.5 39.7 L54 37 L49.5 39.7 L51.1 35 L47.3 31.8 L52.2 31.6 Z" fill="#7c3aed"/>
      {/* grand sourire euphorique */}
      <path d="M16 53 Q40 73 64 53" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* étincelles */}
      <circle cx="12" cy="27" r="3" fill="#a78bfa"/>
      <circle cx="66" cy="20" r="2.2" fill="#c4b5fd"/>
      <circle cx="70" cy="50" r="2" fill="#a78bfa"/>
      <circle cx="10" cy="52" r="1.6" fill="#c4b5fd"/>
      {/* lignes d'énergie */}
      <line x1="10" y1="34" x2="16" y2="34" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="64" y1="26" x2="70" y2="26" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  return null;
}
