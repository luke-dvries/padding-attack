import { useState } from 'react';
import CBCTab     from './learn/CBCTab';
import PaddingTab from './learn/PaddingTab';
import OracleTab  from './learn/OracleTab';
import AttackTab  from './learn/AttackTab';
import './LearnPage.css';

type Tab = 'cbc' | 'padding' | 'oracle' | 'attack';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cbc',     label: '1. AES-CBC' },
  { id: 'padding', label: '2. PKCS#7 Padding' },
  { id: 'oracle',  label: '3. Padding Oracle' },
  { id: 'attack',  label: '4. The Attack' },
];

export default function LearnPage() {
  const [tab, setTab] = useState<Tab>('cbc');

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
        {tab === 'cbc'     && <CBCTab />}
        {tab === 'padding' && <PaddingTab />}
        {tab === 'oracle'  && <OracleTab />}
        {tab === 'attack'  && <AttackTab />}
      </div>
    </div>
  );
}
