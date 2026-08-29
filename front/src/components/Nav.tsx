import { Link } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import "./Nav.css";

interface NavProps {
  initialGameName?: string;
  initialTagLine?: string;
  initialRegion?: import("../hooks/useApi").RiotRegion;
}

// Persistent top navigation shell (54px) — per u.gg structural convention
// (AGENTS.md §12). Brand left, search bar integrated so users can switch
// players without scrolling to a home page.
export function Nav(props: NavProps = {}) {
  return (
    <nav className="nav">
      <Link to="/" className="brand">vibeLol</Link>
      <Link to="/champions" className="nav-link">Champions</Link>
      <div className="nav-search">
        <SearchBar
          initialGameName={props.initialGameName}
          initialTagLine={props.initialTagLine}
          initialRegion={props.initialRegion}
        />
      </div>
    </nav>
  );
}