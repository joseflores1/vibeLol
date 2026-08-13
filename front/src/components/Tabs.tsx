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
// Tabs are present but filter logic wires to the match-history backend
// in PR #9. For now they're interactive (state-managed by the parent).
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