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
import { Button } from "@/components/ui/button"
import { backend } from '@/lib/backend';
import { useEffect, useState } from 'react';
import { toast } from 'sonner'
import { useSelector } from 'react-redux';
export default function ProductionPage() {
  const [sortedMachines, setSortedMachines] = useState(null);
  const [ disabled, setDisabled ] = useState(false);
  const user = useSelector((state) => state.app.user);
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
  const handleRefresh = async () => {
    setDisabled(true);
    try{
      const res = await backend('/data-refresher/updateSchedule');
      const res2 = await backend('/data-refresher/updateHeaps');
      toast.success('Данные обновлены');
    }catch(e){
      console.error(e)
      toast.error('Ошибка при обновлении данных');
    }finally{
      setDisabled(false);
    }
  };
  return (
    <div>
      {user?.roles?.includes('Админ') && (
        <Button onClick={handleRefresh} disabled={disabled}>
          Обновить
        </Button>
      )}
      <Table className="table-fixed w-full">
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
              <TableCell className="text-center border-r">{machine._lastEndTime ? calcDayDifference(machine._lastEndTime) : '-'}</TableCell>
              <TableCell className="text-center border-r">{machine.totalM2.toFixed(2)}</TableCell>
              <TableCell className="text-center border-r">{machine.totalMP.toFixed(2)}</TableCell>
              <TableCell className="text-center border-r">{machine._busyMinutes}</TableCell>
              <TableCell className="text-center border-r">{machine._totalCompleted}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const calcDayDifference = (date) => {
  const targetDate = new Date(date);
  const now = new Date();

  const diffMs = targetDate - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return `${targetDate.toLocaleDateString()} (${diffDays} дн.)`;
}