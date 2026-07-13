'use client'
import { backend } from "@/lib/backend";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner'
export default function ReportsPage() {
  const [reportsList, setReportsList] = useState([]);
  const [createdReports, setCreatedReports] = useState([]);
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    const fetchReports = async () => {
      const res = await backend('/reports/list');
      setReportsList(res.reportsList);
      setCreatedReports(res.createdReports);
    };
    fetchReports();
  }, []);
  const data = createdReports.map((item) => ({
    ...item,
    label: reportsList.find(r => r.type === item.type)?.name || item.type,
    updatedAt: item.createdAt || null,
  }));
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const handleDownload = async (item) => {
    const res = await backend(`/reports/download?uuid=${item.uuid}`, { responseType: 'blob' });

    const url = URL.createObjectURL(res);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${item.uuid}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const handleCreateReport = async (type, filters) => {
    setDisabled(true)
    try{
      const reportBase = reportsList.find(r => r.type === type)
      const formattedFilters = {}
      for(const filter of reportBase.filters) {
        if(!filters[filter]) {
          toast.error(`Необходимо заполнить фильтр ${filter}`)
          return
        }
        if(filter === 'dateRange') {
          formattedFilters.startDate = formatDate(filters[filter].from);
          formattedFilters.endDate = formatDate(filters[filter].to);
        }
      }
      const res = await backend('/reports/create', {
        method: 'POST',
        body: {
          type,
          filters: formattedFilters
        },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${type}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      const listRes = await backend('/reports/list');
      setReportsList(listRes.reportsList);
      setCreatedReports(listRes.createdReports);
    }catch(e){
      console.error(e)
      toast.error(`Ошибка: ${e.message}`)
    }finally{
      setDisabled(false)
    }
  }
  return (
    <div>
      <div className="p-2">
        <Label className="text-lg font-bold pb-2">Созданные отчеты</Label>
        <Table className="w-fit border">
          <TableHeader>
            <TableRow>
              <TableHead className="border">Название</TableHead>
              <TableHead className="border">Когда создано</TableHead>
              <TableHead className="border">Кем создано</TableHead>
              <TableHead className="border">Фильтр</TableHead>
              <TableHead className="border"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item) => (
              <TableRow key={item.uuid}>
                <TableCell className="font-medium border">
                  {item.label}
                </TableCell>

                <TableCell className="border">{item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : "Не обновлялось"}</TableCell>
                <TableCell className="border">{item.user ? item.user.fullname : "Неизвестно"}</TableCell>
                <TableCell className="border">{item.filters ? `${item.filters?.startDate} - ${item.filters?.endDate}` : "Неизвестно"}</TableCell>
                <TableCell className="border">
                  <Button size="xs" variant="outline" onClick={() => handleDownload(item)}>
                    Скачать
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Separator className="my-4 " />
        <Label className="text-lg font-bold pb-2">Создать отчет</Label>
        <div className="flex flex-wrap gap-2">
          {reportsList.map((report) => (
            <ReportCard key={report.type} data={report} onCreate={handleCreateReport} disabled={disabled}/>
          ))}
        </div>
      </div>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export const ReportCard = ({ data, onCreate, disabled }) => {
  const [values, setValues] = useState({});

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{data.name}</CardTitle>
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {data.filters?.map((filter) => {
          if (filter === "dateRange") {
            const value = values[filter] || {};

            return (
              <div key={filter} className="space-y-2">
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />

                      {value.from ? (
                        value.to ? (
                          <>
                            {format(value.from, "dd.MM.yyyy")} —{" "}
                            {format(value.to, "dd.MM.yyyy")}
                          </>
                        ) : (
                          format(value.from, "dd.MM.yyyy")
                        )
                      ) : (
                        "Выберите период"
                      )}
                    </Button>
                  }/>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={value}
                      onSelect={(range) => {
                        setValues((prev) => ({
                          ...prev,
                          [filter]: range || {},
                        }));
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            );
          }
          return null;
        })}
      </CardContent>

      <CardFooter className="p-2">
        <Button size="sm" variant="outline" onClick={() => onCreate(data.type, values)} disabled={disabled}>
          Создать
        </Button>
      </CardFooter>
    </Card>
  );
};