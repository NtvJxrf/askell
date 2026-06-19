'use client';

import { useState } from 'react';
import { CALCULATOR_TABS } from './calc-config';
import { CalculatorForm } from './forms';
import { PositionsPanel } from './PositionsPanel';
import { Divider } from '@/components/Divider';

// Calculators workspace: split into a left forms column (~40%) and a right
// positions-management column (~60%), separated by a thin divider. The left
// column has a tab switcher that selects which calculator form is shown.
export function CalculatorWorkspace() {
  const [activeTab, setActiveTab] = useState(CALCULATOR_TABS[0].id);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Left: forms (~40%) */}
      <section className="flex min-h-0 flex-col lg:w-2/5">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-black/[.06] px-2 py-1.5 dark:border-white/[.06]">
          {CALCULATOR_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'true' : undefined}
                className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  tab.align === 'right' ? 'ml-auto' : ''
                } ${
                  active
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                    : 'text-zinc-600 hover:bg-black/[.04] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active form */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <CalculatorForm tabId={activeTab} />
        </div>
      </section>

      {/* Divider between forms and positions */}
      <Divider />

      {/* Right: positions management (~60%) */}
      <section className="flex min-h-0 flex-1 flex-col p-4">
        <PositionsPanel />
      </section>
    </div>
  );
}
