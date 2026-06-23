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
  console.log(sortedMachines)
  return (
    <TableDemo data={sortedMachines} />
  );
}

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]

export function TableDemo({ data }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Станок</TableHead>
          <TableHead>Освободится</TableHead>
          <TableHead>Всего м²</TableHead>
          <TableHead>Всего м.п.</TableHead>
          <TableHead className="text-right">Всего занят минут</TableHead>
          <TableHead className="text-right">Всего выполнено задач</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((machine) => (
          <TableRow key={machine.name}>
            <TableCell className="font-medium">{machine.name.replace('Trash ', '')}</TableCell>
            <TableCell>{machine._lastEndTime ? calcDayDifference(machine._lastEndTime) : '-'}</TableCell>
            <TableCell>{machine.totalM2.toFixed(2)}</TableCell>
            <TableCell>{machine.totalMP.toFixed(2)}</TableCell>
            <TableCell className="text-right">{machine._busyMinutes}</TableCell>
            <TableCell className="text-right">{machine._totalCompleted}</TableCell>
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