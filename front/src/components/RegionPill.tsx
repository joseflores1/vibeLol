import type { RiotRegion } from "../hooks/useApi";
import { regionDisplayName } from "../constants/regions";
import "./RegionPill.css";

interface RegionPillProps {
  region: RiotRegion;
}

export function RegionPill({ region }: RegionPillProps) {
  return (
    <span className="region-pill">
      <span className="code">{region.toUpperCase()}</span>
      <span className="sep">·</span>
      <span>{regionDisplayName(region)}</span>
    </span>
  );
}