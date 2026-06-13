import "../style.css";

/**
 * Enveloppe commune : en-tête fixe + zone contenu qui remplit l'écran.
 */
export default function ScreenLayout({ children, mainClassName = "" }) {
  const mainClasses = ["screen-page-main", mainClassName].filter(Boolean).join(" ");

  return (
    <div className="screen-page">
      <header className="global-header">Hôtel Président Yamoussoukro</header>
      <main className={mainClasses}>{children}</main>
    </div>
  );
}
