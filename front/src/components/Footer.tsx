import "./Footer.css";

// High-contrast footer with distinct background + top border (Stitch spec).
// Riot Games attribution boilerplate — required by Riot ToS (AGENTS.md §1).
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>
          vibeLol isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
          views or opinions of Riot Games or anyone officially involved in
          producing or managing Riot Games properties. Riot Games and all
          associated properties are trademarks or registered trademarks of
          Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}