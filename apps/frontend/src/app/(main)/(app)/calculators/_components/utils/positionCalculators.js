import glassCalc from '@askell/shared/calc/glass';
import triplexCalc from '@askell/shared/calc/triplex';
import ceraglassCalc from '@askell/shared/calc/ceraglass';
import smdCalc from '@askell/shared/calc/smd';
import glasspacketCalc from '@askell/shared/calc/glasspacket';
import temperingCalc from '@askell/shared/calc/clientGlassTempering';
// Единая карта calcType -> функция калькулятора. Используется для пересчёта
// обрези позиций, а также для импорта/экспорта позиций в Excel.
export const POSITION_CALCULATORS = {
  'Стекло': glassCalc,
  'Триплекс': triplexCalc,
  'Керагласс': ceraglassCalc,
  'СМД': smdCalc,
  'Стеклопакет': glasspacketCalc,
  'Закалка стекла': temperingCalc,
};
