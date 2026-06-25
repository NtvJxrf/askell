'use client';

import { useState } from 'react';
import { PositionsPanel } from './PositionsPanel';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import GlassForm from './forms/GlassForm';
import SMDForm from './forms/SMDForm';
import TriplexForm from './forms/TriplexForm';

export const CALCULATOR_TABS = [
  { id: 'smd', label: 'СМД', form: SMDForm },
  { id: 'glass', label: 'Стекло', form: GlassForm },
  { id: 'triplex', label: 'Триплекс', form: TriplexForm },
  { id: 'keraglass', label: 'Керагласс', form: GlassForm },
  { id: 'glasspacket', label: 'Стеклопакет', form: GlassForm },
  { id: 'tempering', label: 'Закалка', form: GlassForm },
];

export function CalculatorWorkspace() {
  const [activeTab, setActiveTab] = useState(CALCULATOR_TABS[0]);
  const ActiveForm = activeTab.form;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
      <ResizablePanel defaultSize="40%" minSize="300px" className="flex h-full min-h-0 flex-col">
        <Tabs defaultValue="smd">
          <div className="overflow-x-auto">
            <TabsList variant="line" className="flex whitespace-nowrap w-max">
              {CALCULATOR_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <Separator orientation="horizontal" />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {ActiveForm && <ActiveForm />}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle/>

      <ResizablePanel defaultSize="60%" minSize="300px">
        <div className="h-full min-h-0 flex flex-col pl-4 pt-2.5">
          <PositionsPanel />
        </div>
      </ResizablePanel>

    </ResizablePanelGroup>
  );
}
