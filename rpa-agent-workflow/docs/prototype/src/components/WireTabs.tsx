type WireTabsProps = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
};

export function WireTabs({ tabs, active, onChange }: WireTabsProps) {
  return (
    <div className="wire-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={tab === active ? 'active' : ''}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
