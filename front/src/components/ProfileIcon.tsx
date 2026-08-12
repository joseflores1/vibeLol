import "./ProfileIcon.css";

interface ProfileIconProps {
  version: string;
  iconId: number;
  alt?: string;
  size?: number;
}

// Renders a summoner's profile icon image straight from the Data Dragon CDN.
// The backend only exposes the iconId — the icon URL is deterministic
// given the ddragon version, which we fetch up-front via /static/version.
export function ProfileIcon({ version, iconId, alt = "Profile icon", size = 80 }: ProfileIconProps) {
  return (
    <img
      className="profile-icon"
      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`}
      width={size}
      height={size}
      alt={alt}
      loading="lazy"
      onError={(e) => {
        // If the icon doesn't load (e.g., new icon unreleased on ddragon),
        // hide the broken-image glyph and show a neutral placeholder.
        (e.target as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}