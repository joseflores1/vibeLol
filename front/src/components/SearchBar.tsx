import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { REGIONS, type RiotRegion } from "../constants/regions";
import { useSearchSuggest, useStaticVersion } from "../hooks/useApi";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { profileIconUrl } from "../lib/ddragon";
import type { SummonerSuggestion } from "../types/api";
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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(gameName, 250);
  const suggestQuery = useSearchSuggest(debouncedQuery);
  const staticVersion = useStaticVersion();

  const allSuggestions = suggestQuery.data?.suggestions ?? [];
  const noResults =
    !suggestQuery.isFetching
    && debouncedQuery.trim().length >= 2
    && allSuggestions.length === 0;
  const suggestions = open ? allSuggestions : [];
  const showDropdown = open && (suggestions.length > 0 || noResults);

  // Close the dropdown when clicking anywhere outside the field.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const canSubmit = gameName.trim().length > 0 && tagLine.trim().length > 0;

  function selectSuggestion(s: SummonerSuggestion) {
    setOpen(false);
    setActiveIndex(-1);
    navigate(
      `/summoners/${encodeURIComponent(s.gameName)}/${encodeURIComponent(s.tagLine)}?region=${region}`,
    );
  }

  function handleGameNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        // Enter with a highlighted suggestion navigates directly instead
        // of submitting the form.
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

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
      <div className="sb-field" ref={fieldRef}>
        <label className="sr-only" htmlFor="sb-gamename">Game name</label>
        <input
          id="sb-gamename"
          type="text"
          value={gameName}
          onChange={(e) => {
            setGameName(e.target.value);
            setShowTagHint(false);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleGameNameKeyDown}
          onFocus={() => setOpen(true)}
          placeholder="Game name"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 && suggestions[activeIndex]
              ? `${listboxId}-opt-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
        />

        {showDropdown && (
          <ul className="sb-dropdown" id={listboxId} role="listbox" aria-label="Summoner suggestions">
            {suggestions.map((s, i) => (
              <li
                key={`${s.gameName}#${s.tagLine}`}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? "sb-option active" : "sb-option"}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  // mousedown selects before the outside-click handler can
                  // close the dropdown.
                  e.preventDefault();
                  selectSuggestion(s);
                }}
              >
                {s.profileIconId != null && (
                  <img
                    className="sb-icon"
                    src={profileIconUrl(staticVersion.data?.version ?? "", s.profileIconId)}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                )}
                <span className="sb-name">{s.gameName}</span>
                <span className="sb-tag">#{s.tagLine}</span>
              </li>
            ))}
            {suggestions.length === 0 && (
              <li className="sb-option sb-empty" role="status">
                No players found yet — use Search to look them up anyway.
              </li>
            )}
          </ul>
        )}
      </div>

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
