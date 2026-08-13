import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { REGIONS, type RiotRegion } from "../constants/regions";
import "./SearchBar.css";

interface SearchBarProps {
  initialGameName?: string;
  initialTagLine?: string;
  initialRegion?: RiotRegion;
}

export function SearchBar({
  initialGameName = "",
  initialTagLine = "",
  initialRegion = "na1",
}: SearchBarProps) {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState(initialGameName);
  const [tagLine, setTagLine] = useState(initialTagLine);
  const [region, setRegion] = useState<RiotRegion>(initialRegion);
  const [showTagHint, setShowTagHint] = useState(false);

  const canSubmit = gameName.trim().length > 0 && tagLine.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setShowTagHint(true);
      return;
    }
    const g = gameName.trim();
    const t = tagLine.trim();
    navigate(`/summoners/${g}/${t}?region=${region}`);
  }

  return (
    <form className="searchbar" onSubmit={handleSubmit} role="search" aria-label="Summoner search">
      <label className="sr-only" htmlFor="sb-gamename">Game name</label>
      <input
        id="sb-gamename"
        type="text"
        value={gameName}
        onChange={(e) => { setGameName(e.target.value); setShowTagHint(false); }}
        placeholder="Game name"
        autoComplete="off"
        spellCheck={false}
      />

      <label className="sr-only" htmlFor="sb-tagline">Tag line</label>
      <input
        id="sb-tagline"
        type="text"
        value={tagLine}
        onChange={(e) => { setTagLine(e.target.value); setShowTagHint(false); }}
        placeholder="#tag"
        autoComplete="off"
        spellCheck={false}
        aria-describedby={showTagHint ? "sb-tag-hint" : undefined}
        style={{ maxWidth: "8rem" }}
      />

      <label className="sr-only" htmlFor="sb-region">Region</label>
      <select
        id="sb-region"
        value={region}
        onChange={(e) => setRegion(e.target.value as RiotRegion)}
      >
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {r.code.toUpperCase()} — {r.name}
          </option>
        ))}
      </select>

      <button type="submit" disabled={!canSubmit}>Search</button>

      {showTagHint && (
        <span id="sb-tag-hint" className="muted" style={{ alignSelf: "center" }}>
          Enter both a game name and a tag line (e.g., Faker#420).
        </span>
      )}
    </form>
  );
}