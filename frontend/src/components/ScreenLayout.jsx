import "../style.css";

/**
 * Enveloppe commune : en-tête fixe + zone contenu qui remplit l'écran.
 */
export default function ScreenLayout({ children, mainClassName = "", variant = "", headerText = "Hôtel Président Yamoussoukro" }) {
  const mainClasses = ["screen-page-main", mainClassName].filter(Boolean).join(" ");
  const pageClasses = ["screen-page", variant ? `theme-${variant}` : ""].filter(Boolean).join(" ");

  return (
    <div className={pageClasses}>
      <header className="global-header">{headerText}</header>
      <main className={mainClasses}>{children}</main>
    </div>
  );
}
