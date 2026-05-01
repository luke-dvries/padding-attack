import { useState } from 'react';
import CBCTab     from './learn/CBCTab';
import PaddingTab from './learn/PaddingTab';
import OracleTab  from './learn/OracleTab';
import AttackTab  from './learn/AttackTab';
import HistoryTab from './learn/HistoryTab';
import ImpactTab  from './learn/ImpactTab';
import './LearnPage.css';

type Tab = 'cbc' | 'padding' | 'oracle' | 'attack' | 'history' | 'impact';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cbc',     label: '1. AES-CBC' },
  { id: 'padding', label: '2. PKCS#7 Padding' },
  { id: 'oracle',  label: '3. Padding Oracle' },
  { id: 'attack',  label: '4. The Attack' },
  { id: 'history', label: '5. History' },
  { id: 'impact',  label: '6. Real-World Impact' },
];

export default function LearnPage() {
  const [tab, setTab] = useState<Tab>('cbc');

  const tabIndex = TABS.findIndex(t => t.id === tab);
  const nextTab = TABS[tabIndex + 1];
  const onNext = nextTab ? () => setTab(nextTab.id) : undefined;
  const nextLabel = nextTab?.label;

  return (
    <div className="lp">
      <nav className="lp-tabs" aria-label="Learn page sections">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`lp-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="lp-body">
        {tab === 'cbc'     && <CBCTab     onNext={onNext} nextLabel={nextLabel} />}
        {tab === 'padding' && <PaddingTab onNext={onNext} nextLabel={nextLabel} />}
        {tab === 'oracle'  && <OracleTab  onNext={onNext} nextLabel={nextLabel} />}
        {tab === 'attack'  && <AttackTab  onNext={onNext} nextLabel={nextLabel} />}
        {tab === 'history' && <HistoryTab onNext={onNext} nextLabel={nextLabel} />}
        {tab === 'impact'  && <ImpactTab  onNext={onNext} nextLabel={nextLabel} />}
      </div>
    </div>
  );
}
