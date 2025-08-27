import XLSX from "xlsx";
import natural from "natural";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
await axios.post('http://localhost:7878/api/sklad/createPzHook?id=2f914f04-8276-11f0-0a80-078d000f797d')
// 1) Поиск ключа-колонки с именем (например: "Наименование", "Наименование контрагента", и т.п.)
// function detectNameKey(row) {
//   const keys = Object.keys(row || {});
//   const norm = s => (s || "")
//     .toLowerCase()
//     .replace(/\s+/g, "")
//     .replace(/[^\wа-яё]/gi, "");
//   return (
//     keys.find(k => /^наимен/.test(norm(k))) || // начинается с "наимен"
//     keys.find(k => norm(k).includes("наимен")) || // содержит "наимен"
//     "Наименование" // fallback
//   );
// }

// // 2) Нормализация базового имени (отрезаем адреса/реквизиты и чистим)
// function baseName(str) {
//   if (!str) return "";
//   let s = String(str).toLowerCase();

//   // Отрезаем стандартные хвосты
//   s = s.replace(/\/\/.*$/u, " ");        // всё после //
//   s = s.replace(/\bр\/с.*$/iu, " ");      // Р/С …
//   s = s.replace(/\bк\/с.*$/iu, " ");      // К/С …
//   s = s.replace(/\bбик.*$/iu, " ");       // БИК …
//   s = s.replace(/\bинн.*$/iu, " ");       // ИНН …
//   s = s.replace(/\bкпп.*$/iu, " ");       // КПП …
//   s = s.replace(/\bадрес.*$/iu, " ");     // Адрес …
//   s = s.replace(/\bтел[ее]фон.*$/iu, " "); // Телефон …

//   // Оставляем только буквы/цифры/пробел
//   s = s.replace(/[^a-zа-яё0-9\s]/giu, " ");
//   s = s.replace(/\s+/g, " ").trim();
//   return s;
// }

// function areNamesSimilar(a, b, threshold = 0.90) {
//   const s1 = baseName(a);
//   const s2 = baseName(b);
//   if (!s1 || !s2) return false;

//   // Быстрые кейсы
//   if (s1 === s2) return true;
//   if (s1.includes(s2) || s2.includes(s1)) return true;

//   // Метрика похожести
//   const sim = natural.JaroWinklerDistance(s1, s2);
//   return sim >= threshold;
// }

// // 3) Чтение Excel
// const workbook = XLSX.readFile("agent.xlsx");
// const sheetName = workbook.SheetNames[0];
// const sheet = workbook.Sheets[sheetName];
// const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

// if (!data.length) {
//   console.log("Пустой лист или нераспознанные данные.");
//   process.exit(0);
// }

// // Определяем поле с названием
// const NAME_KEY = detectNameKey(data[0]);

// // 4) Группируем по префиксу базового имени, чтобы уменьшить количество сравнений
// const groups = new Map();
// for (const row of data) {
//   const name = row[NAME_KEY];
//   const base = baseName(name);
//   if (!base) continue;
//   const key = base.slice(0, 30); // префикс 30 символов
//   if (!groups.has(key)) groups.set(key, []);
//   groups.get(key).push(row);
// }

// // 5) Сравниваем пары только внутри своих групп
// const clonesList = [];
// for (const group of groups.values()) {
//   for (let i = 0; i < group.length; i++) {
//     for (let j = i + 1; j < group.length; j++) {
//       const a = group[i];
//       const b = group[j];
//       if (areNamesSimilar(a[NAME_KEY], b[NAME_KEY])) {
//         clonesList.push([a, b]);
//       }
//     }
//   }
// }

// console.log(`Найдено пар-дубликатов: ${clonesList.length}`);
// if (clonesList.length === 0) {
//   console.log("Диагностика:");
//   console.log("Ключ поля с наименованием:", NAME_KEY);
//   console.log("Первые ключи строк:", Object.keys(data[0]));
//   console.log("Примеры нормализации:");
//   for (let k = 0; k < Math.min(5, data.length); k++) {
//     const v = data[k][NAME_KEY];
//     console.log("->", v, "=>", baseName(v));
//   }
// } else {
//   // Покажем первые 5 найденных пар
//     const rows = clonesList.map(([a, b]) => ({
//         Name1: a[NAME_KEY],
//         Name2: b[NAME_KEY],
//         }));

//     const newSheet = XLSX.utils.json_to_sheet(rows);
//     const newBook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(newBook, newSheet, "Дубликаты");
//     XLSX.writeFile(newBook, "duplicates.xlsx");
// }