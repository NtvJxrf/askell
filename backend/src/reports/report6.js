import { cuttingPlan } from "../utils/getOrdersInWork.js";
import * as XLSX from 'xlsx';
export default async function createReport (){
  const buffer = XLSX.write(cuttingPlan, {
    bookType: 'xlsx',
    type: 'buffer',
  });
  return buffer
}