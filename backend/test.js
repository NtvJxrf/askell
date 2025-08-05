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
//     workDays: 30,
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

const totalShift = machines.reduce((acc, curr) => {
  return acc + curr.shiftHours
}, 0)
const avgShift = totalShift / machines.length
const totalPCapacityPerMonth = machines.reduce((acc, curr) => {
  return acc + curr.norm * curr.shiftHours * curr.workDays
}, 0)
const pmPerDay = totalPCapacityPerMonth / 30
const daysForCurrentP = meters / pmPerDay
const daysForCuts = cuts / cutsPerHour / 24
console.log(daysForCuts)
console.log(totalPCapacityPerMonth)
console.log(pmPerDay)
