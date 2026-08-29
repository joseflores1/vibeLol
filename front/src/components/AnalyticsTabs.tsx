import { TAB_TO_LABELS, type AnalyticsQueueTab } from "../constants/queues";
import "./Tabs.css";

interface AnalyticsTabsProps {
  active: AnalyticsQueueTab;
  onChange: (tab: AnalyticsQueueTab) => void;
}

// Analytics queue tabs — same visual language as the match-history Tabs,
// but mapped to analytics-eligible queue ids (constants/queues.ts; the
// backend rejects anything else).
export function AnalyticsTabs({ active, onChange }: AnalyticsTabsProps) {
  const keys = Object.keys(TAB_TO_LABELS) as AnalyticsQueueTab[];

  return (
    <div className="tabs">
      {keys.map((key) => (
        <button
          key={key}
          className={key === active ? "tab active" : "tab"}
          onClick={() => onChange(key)}
        >
          {TAB_TO_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
