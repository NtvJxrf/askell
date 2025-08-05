// import Client from './src/utils/got.js';
import dotenv from 'dotenv';
// import { initQueue } from './src/utils/rabbitmq.js';
dotenv.config();
// import * as XLSX from 'xlsx';
// import getOrdersInWork from './src/utils/getOrdersInWork.js';
// import SkladService from './src/services/sklad.service.js';
// import MoySkladController from './src/controllers/moysklad.controller.js';
// import axios from 'axios';
// await axios.post('http://localhost:7878/api/sklad/createPzHook?id=11c410d5-7134-11f0-0a80-13ab003522b9')

/**
 * Рассчитывает количество дней, необходимых для обработки стекла с учётом вырезов.
 * @param {Array} machines - массив объектов станков
 * @param {number} metersToProcess - погонные метры стекла
 * @param {number} cutsCount - количество вырезов
 * @param {number} cutsPerHour - норма по вырезам (штук в час)
 * @returns {object} - часы, дни, детали расчёта
 */
function calculateProductionDays(machines, metersToProcess, cutsCount = 0, cutsPerHour = 8, baseWorkDays = 22) {
  const activeMachines = machines.filter(machine => machine.workDays > 0);

  if (activeMachines.length === 0) {
    throw new Error("Нет активных станков для расчёта.");
  }

  // Суммарная мощность в метрах в час с учётом загрузки
  const totalHourlyCapacity = activeMachines.reduce((sum, machine) => {
    const dayRatio = machine.workDays / baseWorkDays;
    return sum + machine.norm * machine.efficiency * dayRatio;
  }, 0);

  // Часы на метраж
  const hoursForMeters = metersToProcess / totalHourlyCapacity;

  // Часы на вырезы
  const hoursForCuts = cutsCount > 0 ? cutsCount / cutsPerHour : 0;

  const totalHoursRequired = hoursForMeters + hoursForCuts;

  // Взвешенная средняя смена
  const totalShiftHours = activeMachines.reduce((sum, machine) => {
    const dayRatio = machine.workDays / baseWorkDays;
    return sum + machine.shiftHours * dayRatio;
  }, 0);

  const averageShiftHours = totalShiftHours / activeMachines.length;

  const daysRequired = totalHoursRequired / averageShiftHours;

  return {
    totalHoursRequired: +totalHoursRequired.toFixed(2),
    daysRequired: +daysRequired.toFixed(2),
    hoursForMeters: +hoursForMeters.toFixed(2),
    hoursForCuts: +hoursForCuts.toFixed(2),
    averageShiftHours: +averageShiftHours.toFixed(2),
    machinesUsed: activeMachines.length
  };
}


// const machines = [
//   {
//     name: "1 станок на прямолинейке",
//     workDays: 22,
//     shiftHours: 8,
//     efficiency: 1,
//     norm: 48
//   }
// ];

// const machines = [
//   {
//     name: "Работает 1.25 станка в день",
//     workDays: 22,
//     shiftHours: 12,
//     efficiency: 1.25,
//     norm: 14
//   }
// ];

const machines = [
  {
    name: "Станок 1",
    workDays: 22,
    shiftHours: 12,
    efficiency: 1,
    norm: 14
  },
  {
    name: "Станок 2",
    workDays: 15,
    shiftHours: 12,
    efficiency: 1,
    norm: 14
  }
];
const meters = 3132;
const cuts = 183;
const cutsPerHour = 8;

const result = calculateProductionDays(machines, meters, cuts, cutsPerHour);
console.log('1 станок 1.25 в день')
console.log(`Всего часов: ${result.totalHoursRequired}`);
console.log(`Дней загрузки: ${result.daysRequired}`);
console.log(`Часов на метраж: ${result.hoursForMeters}`);
console.log(`Часов на вырезы: ${result.hoursForCuts}`);
console.log(`Станков используется: ${result.machinesUsed}`);
console.log(`Средняя смена: ${result.averageShiftHours} ч`);

