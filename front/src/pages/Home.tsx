import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import "./Home.css";

// Home — search-first landing. The hero IS the search bar (no decorative
// image, per frontend-design skill's restraint principle).
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