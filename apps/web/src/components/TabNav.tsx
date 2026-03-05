export type TabKey = 'dashboard' | 'requests' | 'rfqs' | 'orders' | 'notifications';

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'requests', label: 'Requests' },
  { key: 'rfqs', label: 'RFQs' },
  { key: 'orders', label: 'Orders' },
  { key: 'notifications', label: 'Notifications' },
];

export function TabNav({ active, onChange }: Props) {
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
