import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import "./Home.css";

// Home — search-first landing. Per the frontend-design skill: the hero is a
// thesis. Here the thesis is "this site exists to look up players." No
// decorative hero image, no gradient blob — the search bar IS the hero.
//.oneshot
export function HomePage() {
  return (
    <>
      <section className="home container">
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