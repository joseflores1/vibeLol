import "./Tabs.css";

export type MatchTab = "all" | "solo" | "flex" | "normal";

const TAB_LABELS: Record<MatchTab, string> = {
  all: "All",
  solo: "Ranked Solo",
  flex: "Ranked Flex",
  normal: "Normal",
};

interface TabsProps {
  active: MatchTab;
  onChange: (tab: MatchTab) => void;
}

// Segmented tab filter (per u.gg structural convention, AGENTS.md §12).
// Filter state lives in the parent (SummonerProfile); the active tab is
// passed down to MatchHistory, which maps it to backend queue/type params
// via the TAB_TO_QUERY constant.
export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {(Object.keys(TAB_LABELS) as MatchTab[]).map((key) => (
        <button
          key={key}
          className={key === active ? "tab active" : "tab"}
          onClick={() => onChange(key)}
        >
          {TAB_LABELS[key]}
        </button>
      ))}
    </div>
  );
}