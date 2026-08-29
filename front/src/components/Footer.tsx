import { Link } from "react-router-dom";
import { useStaticVersion } from "../hooks/useApi";
import "./Footer.css";

// Structured footer (Stitch spec): brand / data / resources columns on the
// high-contrast band, with the Riot Games attribution boilerplate —
// required by Riot ToS (AGENTS.md §1) — in its own bottom bar so it stays
// visible on every page.
export function Footer() {
  const version = useStaticVersion();

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">vibeLol</Link>
          <p className="footer-tagline">
            League of Legends stats — profiles, match history, and champion
            analytics, straight from the game&apos;s own data.
          </p>
        </div>

        <div className="footer-col">
          <h3 className="footer-heading">Data</h3>
          <ul>
            <li>
              Data Dragon patch{" "}
              <span className="footer-patch numeric">
                {version.data?.version ?? "—"}
              </span>
            </li>
            <li>Static data via Data Dragon CDN</li>
            <li>Live stats via Riot Games API</li>
          </ul>
        </div>

        <div className="footer-col">
          <h3 className="footer-heading">Resources</h3>
          <ul>
            <li>
              <a
                href="https://github.com/joseflores1/vibeLol"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source on GitHub
              </a>
            </li>
            <li>
              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Riot Developer Portal
              </a>
            </li>
            <li>
              <a
                href="https://www.riotgames.com/en/legal"
                target="_blank"
                rel="noopener noreferrer"
              >
                Riot Games Legal
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>
            vibeLol isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
            views or opinions of Riot Games or anyone officially involved in
            producing or managing Riot Games properties. Riot Games and all
            associated properties are trademarks or registered trademarks of
            Riot Games, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
