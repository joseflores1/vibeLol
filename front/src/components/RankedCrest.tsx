interface RankedCrestProps {
  tier: string;
  size?: number;
}

const CREST_BASE =
  "https://raw.githubusercontent.com/communitydragon/communitydragon-assets/master/assets/images/rankedcrests/24.6.1/24.6.1_";

// Community Dragon tier crest inset for ranked cards (per Stitch spec,
// AGENTS.md §12). Tier name must be lowercase in the URL.
export function RankedCrest({ tier, size = 80 }: RankedCrestProps) {
  const url = `${CREST_BASE}${tier.toLowerCase()}.png`;
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt={`${tier} crest`}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.visibility = "hidden";
      }}
      style={{ flexShrink: 0 }}
    />
  );
}