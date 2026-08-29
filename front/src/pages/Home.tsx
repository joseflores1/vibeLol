import { useState } from "react";
import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import { championSplashUrl } from "../lib/ddragon";
import "./Home.css";

// Rotating hero splashes — deterministic per day so a reload doesn't jump
// champions, but the landing page still evolves over time. Full list of
// alphabetic IDs comes from /static/champions; these are curated picks
// with splash art that reads well dimmed behind text.
const SPLASH_ROTATION = [
  "Lux",
  "Ahri",
  "Yasuo",
  "Jinx",
  "Thresh",
  "Ekko",
  "Katarina",
  "LeeSin",
] as const;

// Home — search-first landing. A dimmed Data Dragon champion splash gives
// the hero atmosphere; the scrim keeps contrast for the text and respects
// the design system's no-glow rule (a flat scrim, not decoration).
export function HomePage() {
  // Deterministic per day; the lazy initializer keeps the impure clock read
  // out of the render body (react-hooks/purity).
  const [splashChampion] = useState(
    () => SPLASH_ROTATION[Math.floor(Date.now() / 86_400_000) % SPLASH_ROTATION.length]!,
  );

  return (
    <>
      <section
        className="home container"
        style={{ "--splash": `url('${championSplashUrl(splashChampion)}')` } as React.CSSProperties}
      >
        <div className="home-hero" aria-hidden="true" />
        <h1>vibeLol</h1>
        <p className="tagline">
          League of Legends stats. Search any player by Riot ID + region.
        </p>
        <SearchBar />
      </section>
      <Footer />
    </>
  );
}
