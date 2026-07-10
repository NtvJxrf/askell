'use client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button, buttonVariants } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { backend } from '@/lib/backend';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner'
import { useSelector } from 'react-redux';
import { ChevronsUpDown, Loader2 } from 'lucide-react';

// Соответствие станков и очередей (heaps), из которых они забирают детали.
// Синхронизировано со списком станков в packages/shared/src/simulation.js
const MACHINE_HEAPS = {
  'Раскрой': ['Раскрой'],
  'Дабл эджер': ['ПР Полировка', 'ПР Шлифовка'],
  'Ялонг': ['ПР Притупка'],
  'Интермак': ['КР Полировка', 'КР Шлифовка'],
  'Альпа большая': ['КР Полировка', 'КР Шлифовка'],
  'Альпа малая': ['КР Полировка', 'КР Шлифовка'],
  'Сверление': ['Сверление'],
  'Закалка': ['Закалка'],
  'Триплекс': ['Триплексование'],
};

// Этапы без выделенного станка (в simulation.js попадают в TrashMachine
// как `Trash <этап>`), которые всё равно нужно показывать в графике и
// загруженности наравне с реальными станками.
const EXTRA_VISIBLE_STAGES = ['Сборка стеклопакета'];

const getMachineHeaps = (name) => {
  if (MACHINE_HEAPS[name]) return MACHINE_HEAPS[name];
  if (name.startsWith('Trash ')) return [name.replace('Trash ', '')];
  return [];
};

const isVisibleMachine = (name) => (
  Boolean(MACHINE_HEAPS[name]) || EXTRA_VISIBLE_STAGES.includes(name.replace('Trash ', ''))
);

// Только очереди, которыми пользуются реальные станки + доп. видимые этапы
const REAL_HEAP_NAMES = new Set([...Object.values(MACHINE_HEAPS).flat(), ...EXTRA_VISIBLE_STAGES]);

// Группы станков для карточек сводки
const MACHINE_GROUPS = {
  'Криволинейка': ['Интермак'],
  'Прямолинейка': ['Дабл эджер'],
  'Притупка': ['Ялонг'],
  'Триплекс': ['Триплекс'],
  'Стеклопакеты': ['Изготовление рамки', 'Сборка стеклопакета', 'Вторичная герметизация'],
};

const formatSnapshotTime = (time) => new Date(time).toLocaleString('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// Цвет для срока освобождения станка/группы: < 5 дн. — зелёный, 5-10 — оранжевый, > 10 — красный
const getDiffDaysColorClass = (diffDays) => {
  if (diffDays < 5) return 'text-green-600';
  if (diffDays <= 10) return 'text-orange-500';
  return 'text-red-600';
};

export default function ProductionPage() {
  const [sortedMachines, setSortedMachines] = useState(null);
  const [history, setHistory] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [materialsTableOpen, setMaterialsTableOpen] = useState(false);
  const [timeIndex, setTimeIndex] = useState(0);
  const user = useSelector((state) => state.app.user);
  const heaps = useSelector((state) => state.app.heaps?.['Раскрой']) || [];
  const updates = useSelector((state) => state.app.selfcost?.updates) || {};
  useEffect(() => {
    console.time('fetchData')
    const fetchData = async () => {
      const simulationResult = await backend('/data-refresher/getSimulationResult');
      console.log(simulationResult)
      const sortedMachines = simulationResult.machines.sort((a, b) => {
        if (b.totalM2 !== a.totalM2) {
          return b.totalM2 - a.totalM2;
        }

        return new Date(b._lastEndTime) - new Date(a._lastEndTime);
      });
      setSortedMachines(sortedMachines);
      const simHistory = simulationResult.history || [];
      setHistory(simHistory);
      setTimeIndex(0);
    };
    fetchData().finally(() => console.timeEnd('fetchData'));
  }, []);
  const handleRefresh = async () => {
    setDisabled(true);
    try{
      const res = await backend('/data-refresher/updateProductinLoad');
      toast.success('Данные обновлены');
    }catch(e){
      console.error(e)
      toast.error('Ошибка при обновлении данных');
    }finally{
      setDisabled(false);
    }
  };
  const materials = useMemo(() => {
    const mats = heaps.reduce((acc, item) => {
      if(item.tier == 1){
        acc[item.attributes['Материал 1']] ??= 0
        const area = item.attributes['Длина в мм'] * item.attributes['Ширина в мм'] / 1e6
        acc[item.attributes['Материал 1']] += area
      }
      return acc;
    }, {});
    return Object.entries(mats)
      .map(([material, area]) => ({
        material,
        area,
      }))
      .sort((a, b) => b.area - a.area);
  }, [heaps])
  const realMachines = useMemo(() => (
    (sortedMachines || []).filter((machine) => isVisibleMachine(machine.name))
  ), [sortedMachines]);
  const machineGroups = useMemo(() => (
    Object.entries(MACHINE_GROUPS).map(([groupName, machineNames]) => {
      const groupMachines = (sortedMachines || []).filter((machine) => machineNames.includes(machine.name));
      const totalM2 = groupMachines.reduce((sum, m) => sum + m.totalM2, 0);
      const totalMP = groupMachines.reduce((sum, m) => sum + m.totalMP, 0);
      const lastEndTime = groupMachines.reduce((latest, m) => (
        m._lastEndTime && (!latest || new Date(m._lastEndTime) > new Date(latest)) ? m._lastEndTime : latest
      ), null);
      return { groupName, totalM2, totalMP, lastEndTime };
    })
  ), [sortedMachines]);
  const heapKeys = useMemo(() => {
    const keys = new Set();
    for (const snapshot of history) {
      for (const key of Object.keys(snapshot.heaps || {})) {
        if (REAL_HEAP_NAMES.has(key)) keys.add(key);
      }
    }
    return Array.from(keys);
  }, [history]);
  const chartConfig = useMemo(() => (
    heapKeys.reduce((acc, key, i) => {
      acc[key] = { label: key, color: `var(--chart-${(i % 5) + 1})` };
      return acc;
    }, {})
  ), [heapKeys]);
  const chartData = useMemo(() => (
    history.map((snapshot) => ({
      time: formatSnapshotTime(snapshot.time),
      ...heapKeys.reduce((acc, key) => {
        acc[key] = snapshot.heaps?.[key] || 0;
        return acc;
      }, {}),
    }))
  ), [history, heapKeys]);
  const maxByMachine = useMemo(() => {
    const max = {};
    for (const machine of realMachines) {
      const heaps = getMachineHeaps(machine.name);
      max[machine.name] = history.reduce((acc, snapshot) => {
        const count = heaps.reduce((sum, heapName) => sum + (snapshot.heaps?.[heapName] || 0), 0);
        return Math.max(acc, count);
      }, 0);
    }
    return max;
  }, [history, realMachines]);
  const currentSnapshot = history[timeIndex] || null;
  const getMachineCount = (machineName) => {
    if (!currentSnapshot) return 0;
    return getMachineHeaps(machineName)
      .reduce((sum, heapName) => sum + (currentSnapshot.heaps?.[heapName] || 0), 0);
  };
  const getMachineTask = (machineName) => (
    currentSnapshot?.machines?.find((m) => m.name === machineName) || null
  );
  return ( 
    heapKeys.length > 0 ? (
      <div className="flex flex-col gap-4 p-4">
        {user?.roles?.includes('Админ') && (
          <div className="flex items-center gap-4">
            <Button onClick={handleRefresh} disabled={disabled} className="w-fit">
              Обновить
            </Button>
            <span>Обновлено: {updates?.productionLoad ? new Date(updates.productionLoad).toLocaleString("ru-RU") : "Не обновлялось"}</span>
          </div>
        )}
        {sortedMachines && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {machineGroups.map((group) => (
              <Card key={group.groupName}>
                <CardHeader>
                  <CardTitle className="text-base">{group.groupName}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <div>
                    Завершение:{' '}
                    {group.lastEndTime ? (() => {
                      const { targetDate, diffDays } = calcDayDifference(group.lastEndTime);
                      return (
                        <>
                          <span>{targetDate}</span>
                          <span className={getDiffDaysColorClass(diffDays)}> ({diffDays} дн.)</span>
                        </>
                      );
                    })() : '-'}
                  </div>
                  <div>Всего м²: {group.totalM2.toFixed(2)}</div>
                  <div>Всего м.п.: {group.totalMP.toFixed(2)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {heapKeys.length > 0 && (
          <div className="rounded-xl border p-4">
            <div className="mb-3 text-base font-medium">Очереди во времени</div>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                {heapKeys.map((key) => (
                  <Area
                    key={key}
                    dataKey={key}
                    type="monotone"
                    fill={`var(--color-${key})`}
                    fillOpacity={0.25}
                    stroke={`var(--color-${key})`}
                    stackId="a"
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </div>
        )}
        {history.length > 0 && (
          <div className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="text-base font-medium">Загруженность станков (детали в очереди)</div>
              <div className="text-sm text-muted-foreground">
                {currentSnapshot ? formatSnapshotTime(currentSnapshot.time) : '-'}
              </div>
            </div>
            <div className="mb-4 rounded-lg border bg-muted/40 p-3">
              <Slider
                value={[timeIndex]}
                onValueChange={(val) => setTimeIndex(Array.isArray(val) ? val[0] : val)}
                min={0}
                max={Math.max(history.length - 1, 0)}
                step={1}
              />
            </div>
            <div className="flex flex-col gap-3">
              {realMachines.map((machine) => {
                const count = getMachineCount(machine.name);
                const max = maxByMachine[machine.name] || 0;
                const value = max > 0 ? (count / max) * 100 : 0;
                const task = getMachineTask(machine.name);
                return (
                  <div key={machine.name} className="flex items-center gap-3">
                    <div className="w-[150px] shrink-0 truncate text-sm">{machine.name.replace('Trash ', '')}</div>
                    <Progress value={value} className="w-1/2" />
                    <div className="w-[32px] shrink-0 text-right text-sm tabular-nums">{count}</div>
                    <div className="flex-1 min-w-0 flex items-baseline gap-1 text-sm text-muted-foreground">
                      {task?.task ? (
                        <>
                          <span className="truncate">{task.task}</span>
                          <span className="shrink-0">·{task.remaining} мин</span>
                        </>
                      ) : 'Простаивает'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
          <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-1.5")}>
            <ChevronsUpDown className="size-4" />
            {tableOpen ? 'Скрыть таблицу станков' : 'Показать таблицу станков'}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table className="table-fixed w-full mt-3">
              <TableHeader className="text-[14px]">
                <TableRow className="border-t">
                  <TableHead className="w-[150px] border-r">Станок</TableHead>
                  <TableHead className="w-[25px] text-center border-r">Освободится</TableHead>
                  <TableHead className="w-[20px] text-center border-r">Всего м²</TableHead>
                  <TableHead className="w-[20px] text-center border-r">Всего м.п.</TableHead>
                  <TableHead className="w-[30px] text-center border-r">Всего занят минут</TableHead>
                  <TableHead className="w-[30px] text-center border-r">Всего выполнено задач</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMachines?.map((machine) => (
                  <TableRow key={machine.name}>
                    <TableCell className="font-medium border-r">{machine.name.replace('Trash ', '')}</TableCell>
                    <TableCell className="text-center border-r">
                      {machine._lastEndTime ? (() => {
                        const { targetDate, diffDays } = calcDayDifference(machine._lastEndTime);
                        return (
                          <>
                            <span>{targetDate}</span>
                            <span className={getDiffDaysColorClass(diffDays)}> ({diffDays} дн.)</span>
                          </>
                        );
                      })() : '-'}
                    </TableCell>
                    <TableCell className="text-center border-r">{machine.totalM2.toFixed(2)}</TableCell>
                    <TableCell className="text-center border-r">{machine.totalMP.toFixed(2)}</TableCell>
                    <TableCell className="text-center border-r">{machine._busyMinutes}</TableCell>
                    <TableCell className="text-center border-r">{machine._totalCompleted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible open={materialsTableOpen} onOpenChange={setMaterialsTableOpen}>
          <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-1.5")}>
            <ChevronsUpDown className="size-4" />
            {materialsTableOpen ? 'Скрыть таблицу материалов' : 'Показать таблицу материалов'}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <span>В списке материалы только из ПЗ</span>
            <Table className="table-fixed w-auto mt-3">
              <TableHeader className="text-[14px]">
                <TableRow className="border-t">
                  <TableHead className="w-[150px] border-r">Материал</TableHead>
                  <TableHead className="w-[100px] text-center border-r">м²</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.map((material) => (
                  <TableRow key={material.material}>
                    <TableCell className="font-medium border-r">{material.material}</TableCell>
                    <TableCell className="text-center border-r">{material.area.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ) : (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  )
}

const calcDayDifference = (date) => {
  const targetDate = new Date(date);
  const now = new Date();

  const diffMs = targetDate - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    targetDate: targetDate.toLocaleDateString(),
    diffDays,
  };
}