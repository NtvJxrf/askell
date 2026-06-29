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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      <ResizablePanel defaultSize="40%" minSize="150px" className="flex h-full min-h-0 flex-col">
        <Tabs defaultValue="smd">
          <div className="flex w-full items-center">
            <div className="overflow-x-auto flex-1">
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
            <Popover>
              <PopoverTrigger render={
                <Button variant="ghost" className="text-muted-foreground hover:bg-transparent">
                  <CircleAlert/>
                </Button>
              }/>
              <PopoverContent className="w-auto max-w-none">
                <div className="flex flex-col gap-1 text-sm whitespace-nowrap">
                  <b>КР шлифовка и полировка</b>
                  <div>- Максимум 3600×1800 мм.</div>
                  <div>- Минимум 250×250 или 100х500 мм.</div>
                  <div>- Притупка на криволинейке недоступна.</div>
                  <br />

                  <b>ПР шлифовка и полировка</b>
                  <div>- Максимум 3700×3700 мм.</div>
                  <div>- Минимум 150×200 мм.</div>
                  <div>- При размере менее 350×350 мм запускать только небольшими партиями.</div>
                  <br />

                  <b>ПР притупка</b>
                  <div>- Максимум 6000×3000 мм.</div>
                  <div>- Минимум 550×350 мм.</div>
                  <br />

                  <b>Закалка</b>
                  <div>- Максимум 6000×2800 мм.</div>
                  <div>- Минимум 500×200 мм.</div>
                  <div>- Зеркало — нельзя.</div>
                  <br />

                  <b>Триплекс</b>
                  <div>- Максимум 3900×1900 мм.</div>
                  <br />

                  <b>Стеклопакет</b>
                  <div>- Максимум 4500×2800 мм.</div>
                  <div>- Минимум 350×250 мм.</div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Tabs>

        <Separator orientation="horizontal" />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {ActiveForm && <ActiveForm />}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle/>

      <ResizablePanel defaultSize="60%" minSize="150px">
        <div className="h-full min-h-0 flex flex-col pl-4 pt-2.5">
          <PositionsPanel />
        </div>
      </ResizablePanel>

    </ResizablePanelGroup>
  );
}
