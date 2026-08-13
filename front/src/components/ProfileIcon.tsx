interface ProfileIconProps {
  version: string;
  iconId: number;
  level?: number;
  alt?: string;
  size?: number;
}

// 96px gold-bordered profile icon with level pill overlaid at the
// bottom-center (per Stitch spec, AGENTS.md §12).
export function ProfileIcon({ version, iconId, level, alt = "Profile icon", size = 96 }: ProfileIconProps) {
  return (
    <div className="profile-icon-wrap">
      <img
        className="profile-icon"
        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`}
        width={size}
        height={size}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.visibility = "hidden";
        }}
      />
      {level !== undefined && (
        <span className="level-pill">{level}</span>
      )}
    </div>
  );
}