import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { SearchBar } from "../components/SearchBar";
import "./NotFound.css";

// 404 — errors never apologize and never dead-end (AGENTS.md §12): state
// what happened, keep the search bar visible as the way forward.
export function NotFoundPage() {
  return (
    <>
      <Nav />
      <section className="notfound container">
        <p className="nf-code numeric">404</p>
        <h1>This page doesn&apos;t exist.</h1>
        <p className="nf-hint">
          The URL may be mistyped, or the page moved. Try a summoner search:
        </p>
        <SearchBar />
        <Link to="/" className="nf-home">← Back to home</Link>
      </section>
      <Footer />
    </>
  );
}
