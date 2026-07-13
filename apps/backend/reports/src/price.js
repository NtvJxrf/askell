import ExcelJS from 'exceljs';
import { valkey } from '@askell/shared';
import calculate from "@askell/shared/calc/glass"
import calculateTriplex from "@askell/shared/calc/triplex"
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = path.resolve(__dirname, 'price_template.xlsx');
export default async function createReport (){
    const materialsRaw = JSON.parse(await valkey.get('sklad:data:materials'))
    const filterWrods = ['стекло', 'зеркало'];
    const materials = Object.keys(materialsRaw)
    .filter(el => filterWrods.some(word => el.toLowerCase().includes(word)))
    .sort();

    const selfcost = {}
    const DATA_KEYS = ['colors', 'unders', 'materials', 'packaging', 'pricesAndCoefs']
    const dataValues = DATA_KEYS.length
    ? await valkey.mget(DATA_KEYS.map(k => `sklad:data:${k}`))
    : []

    for (let i = 0; i < DATA_KEYS.length; i++) {
        const key = DATA_KEYS[i]

        try {
            const parsed = dataValues[i] ? JSON.parse(dataValues[i]) : {}
            selfcost[key] = Object.fromEntries(
            Object.entries(parsed).map(([itemName, itemValue]) => {
                const { meta, ...rest } = itemValue
                return [itemName, rest]
            })
            )
        } catch {
            selfcost[key] = {}
        }
    }
    const now = new Date();
    const data = {
        moment: `Прайс на стекло от ${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
    };
    for (const material of materials) {
        const fullName = material
        if(!materialsRaw[material]?.sizes) continue
        const match = fullName.match(/(.+?),\s*(\d+)\s*мм/i)
        if (!match) continue

        const [_, name, thickness] = match
        const thickNum = thickness.trim()

        if (!data[name]) data[name] = {}
        if (!data[name][thickNum]) data[name][thickNum] = {}

        // Для каждого shape вызываем calculate отдельно
        const shapes = { straight: true, curved: false }
        for (const [variant, shapeValue] of Object.entries(shapes)) {
            const calc = calculate({
                material,
                height: 1000,
                width: 1000,
                tempered: !material.includes('Зеркало'),
                shape: shapeValue
            }, selfcost)

            data[name][thickNum][variant] = calc.prices
        }

        // Триплекс расчеты с ключами по пленке
        const triplexTapes = {
            none: undefined,
            green: "Пленка EVA Green",
            smart: "Многослойная смарт-пленка White"
        }

        data[name][thickNum].triplex = {}

        for (const [key, tape1] of Object.entries(triplexTapes)) {
            const triplexCalc = calculateTriplex({
                material1: material,
                material2: material,
                height: 1000,
                width: 1000,
                tempered: !material.includes('Зеркало'),
                shape: true, // straight по умолчанию
                tape1
            }, selfcost)

            data[name][thickNum].triplex[key] = triplexCalc.prices
        }
    }
    const worksCalc = calculate({
        material: 'Стекло М1, 4 мм',
        height: 1000,
        width: 1000,
        tempered: true,
        drills: 1,
        zenk: 1,
        cutsv1: 1,
        cutsv2: 1,
        cutsv3: 1,
        print: 1,
        color: 'RAL 1015 (Бежевый)',
        rounding: 'Округление до 0.5',
    }, selfcost)
    data.works = Object.fromEntries(
        worksCalc.result.works.map(work => {
            return [work.name, {
                gostPrice: work.finalValue * selfcost.pricesAndCoefs[`Стекло Выше госта`].value,
                retailPrice: work.finalValue * selfcost.pricesAndCoefs[`Стекло Розница`].value,
                bulkPrice: work.finalValue * selfcost.pricesAndCoefs[`Стекло Опт`].value,
                dealerPrice: work.finalValue * selfcost.pricesAndCoefs[`Стекло Дилер`].value,
                vipPrice: work.finalValue * selfcost.pricesAndCoefs[`Стекло ВИП`].value
            }]
        })
    )
    function getValueByPath(obj, path) {
        if (path.startsWith('data.')) path = path.slice(5);
        return path.split('.').reduce((acc, key) => acc?.[key.trim()], obj);
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE);
    for (const sheet of workbook.worksheets) {
        sheet.eachRow(row => {
            row.eachCell(cell => {
            if (typeof cell.value !== 'string') return;

            const match = cell.value.match(/^\{\{(.+?)\}\}$/); // только точное совпадение
            if (match) {
                let value = getValueByPath(data, match[1]);
                if (typeof value === 'number') value = Math.ceil(value / 10) * 10;
                cell.value = value ?? '';
            }
            });
        });
    }
    const uuid = crypto.randomUUID();
    const filePath = path.join(__dirname, "../temporal", `${uuid}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    const buffer = await workbook.xlsx.writeBuffer();
    return {
        buffer: Buffer.from(buffer),
        uuid,
        createdAt: Date.now(),
    };
}