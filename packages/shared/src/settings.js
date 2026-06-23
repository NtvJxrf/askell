import { z } from "zod";

export const settingsSchema = {
  overdueDays: {
    default: 2,
    schema: z.number().int().min(0).max(30),
    description: "Количество дней, которое прибавляется к сегодняшнему дню чтобы определить просроченные заказы.",
  },
  addProdDays: {
    default: 0,
    schema: z.number().int().min(0).max(30),
    description: "Количество дней, которое прибавляется к сроку изготовления которое посчитал калькулятор.",
  }
};