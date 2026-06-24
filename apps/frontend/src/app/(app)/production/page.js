'use client'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { backend } from '@/lib/backend';
import { useEffect, useState } from 'react';
export default function ProductionPage() {
  const [sortedMachines, setSortedMachines] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const simulationResult = await backend('/data-refresher/getSimulationResult');
      const sortedMachines = simulationResult.machines.sort((a, b) => {
        if (b.totalM2 !== a.totalM2) {
          return b.totalM2 - a.totalM2;
        }

        return new Date(b._lastEndTime) - new Date(a._lastEndTime);
      });
      setSortedMachines(sortedMachines);
    };
    fetchData();
  }, []);
  return (
    <TableDemo data={sortedMachines} />
  );
}

export function TableDemo({ data }) {
  return (
    <Table className="table-fixed w-full">
      <TableHeader className="text-[14px]">
        <TableRow>
          <TableHead className="w-[150px] border-r">Станок</TableHead>
          <TableHead className="w-[25px] text-center border-r">Освободится</TableHead>
          <TableHead className="w-[20px] text-center border-r">Всего м²</TableHead>
          <TableHead className="w-[20px] text-center border-r">Всего м.п.</TableHead>
          <TableHead className="w-[30px] text-center border-r">Всего занят минут</TableHead>
          <TableHead className="w-[30px] text-center border-r">Всего выполнено задач</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((machine) => (
          <TableRow key={machine.name}>
            <TableCell className="font-medium border-r">{machine.name.replace('Trash ', '')}</TableCell>
            <TableCell className="text-center border-r">{machine._lastEndTime ? calcDayDifference(machine._lastEndTime) : '-'}</TableCell>
            <TableCell className="text-center border-r">{machine.totalM2.toFixed(2)}</TableCell>
            <TableCell className="text-center border-r">{machine.totalMP.toFixed(2)}</TableCell>
            <TableCell className="text-center border-r">{machine._busyMinutes}</TableCell>
            <TableCell className="text-center border-r">{machine._totalCompleted}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const calcDayDifference = (date) => {
  const targetDate = new Date(date);
  const now = new Date();

  const diffMs = targetDate - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return `${targetDate.toLocaleDateString()} (${diffDays} дн.)`;
}