import { constructWorks, constructExpenses } from './triplexCalc.js'
const Calculate = (data, selfcost) => {
    console.log(data)
    console.log(selfcost)
    const { height, width, cutsv1, cutsv2, cutsv3, material1, material2, blank, color, under, customertype } = data
    const heightsRaw = Object.entries(data).filter(([key]) => /^height\d+$/.test(key)).map(([_, value]) => value);
    const heights = heightsRaw.length > 0 ? heightsRaw : [height];
    const widthsRaw = Object.entries(data).filter(([key]) => /^width\d+$/.test(key)).map(([_, value]) => value)
    const widths = widthsRaw.length > 0 ? widthsRaw : [width]
    const materials = [material1, material2]
    const stanok = 'Криволинейка'
    const S_all = (height * width) / 1000000
    const P_all = 2 * (height + width) / 1000
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {},
        errors: [],
        warnings: []
    }
    let weight = 0
    let name = `Керагласс, ${materials.join(' + ')}, (${height}х${width}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''})`
    color && result.materials.push({
        name: color,
        value: selfcost.colors[color].value * 0.3,
        string: `${selfcost.colors[color].value} * 0.3`,
        formula: 'Цена * 0.3'
    });
    result.materials.push({
        name: 'Эпоксидная смола',
        value: selfcost.materials[`Эпоксидная смола`].value * Math.max(0.17 * S_all, 0.5),
        string: `${selfcost.materials[`Эпоксидная смола`].value} * ${Math.max(0.17 * S_all, 0.5)}`,
        formula: 'Цена * Большее из 0.17 * S или 0.5'
    });
    if(blank){
        result.materials.push({
            name: 'Пятак капролон черный D32 H11 М8',
            value: selfcost.materials[`Пятак капролон черный D32 H11 М8`].value * blank,
            string: `${selfcost.materials[`Пятак капролон черный D32 H11 М8`].value} * ${blank}`,
            formula: 'Цена * количество'
        });
        const context = { selfcost, result };
        constructWorks('zenk', blank, context)
    }
    const context = { selfcost, result };
    for(const material of materials){
        const P = heights.reduce((sum, h, i) => sum + 2 * (Number(h) + Number(widths[i])), 0) / 1000;
        const S = heights.reduce((sum, h, i) => sum + Number(h) * Number(widths[i]), 0) / 1_000_000;
        if(material.toLowerCase().includes('стекло')){
            result.materials.push({
                name: material,
                value: selfcost.materials[material].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
                string: `${selfcost.materials[material].value} * ${S} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло']}`,
                formula: 'Цена * S * Коэффициент обрези стекло'
            });
            const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
            const context = { selfcost, result, thickness, stanok };
            constructWorks('cutting1', S, context);
            constructWorks('cutting2', S, context);
            constructWorks('tempered', S, context);
            constructWorks('curvedProcessing', P, context);
            continue
        }
        const sheetWidth = selfcost.materials[material].w, sheetHeight = selfcost.materials[material].l
        const S_cera = sheetHeight * sheetWidth / 1000000
        const parts = widths.map((w, i) => ({
          w,
          h: heights[i]
        }));
        let count = countSheets(sheetWidth, sheetHeight, parts)
        if(typeof count === 'string'){
          result.errors.push(count)
          count = 999
        }
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S *  (1 + (1 - S_all / (count * S_cera)) + selfcost.pricesAndCoefs[`Коэффициент брака керамика`]),
            string: `${selfcost.materials[material].value} * ${S} * ${(1 + (1 - S_all / (count * S_cera)) + selfcost.pricesAndCoefs[`Коэффициент брака керамика`])}`,
            formula: 'Цена * S * (Коэффициент обрези керамика + Коэффициент брака керамика)'
        });
        constructWorks('cuttingCera', S, context);
    }
    constructWorks('curvedProcessing', P_all, context);
    constructWorks('lamination', S_all, context);
    constructWorks('washing1', S_all * heights.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S_all, context);
    const [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses] = constructExpenses(result, selfcost)
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Керагласс ${customertype}`] + (under && selfcost.unders[under].value || 0)
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks + commercialExpenses + householdExpenses + workshopExpenses,
        string: `${(materialsandworks).toFixed(2)} + ${(commercialExpenses + householdExpenses + workshopExpenses).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы + Подстолье`
    },{
        name: 'Наценка',
        value: selfcost.pricesAndCoefs[`Керагласс ${customertype}`],
        string: selfcost.pricesAndCoefs[`Керагласс ${customertype}`],
        formula: `Наценка для типа клиента ${selfcost.pricesAndCoefs[`Керагласс ${customertype}`]}`
    }]
    under && result.finalPrice.push({
        name: 'Подстолье',
        value: selfcost.unders[under].value,
        string: selfcost.unders[under].value,
        formula: `Цена подстолья`
    })
    result.other = {
        S: S_all,
        productType: true,
        type: 'Керагласс',
        stanok,
        viz: true,
        materials
    }
    console.log(result)
    return {
        key: Date.now(),
        name,
        price,
        added: false,
        quantity: 1,
        initialData: data,
        result
    }
}

function countSheets(sheetWidth, sheetHeight, parts) {
  // сортируем по убыванию высоты
  const items = parts.slice().sort((a, b) => b.h - a.h);
  const sheets = [];
  let error = null
  items.forEach(({ w, h }, idx) => {
    if (w > sheetWidth || h > sheetHeight) {
      error = `Деталь с размерами ${w}×${h} не помещается на лист ${sheetWidth}×${sheetHeight}`
    }

    let placed = false;
    for (const sheet of sheets) {
      const usedHeight = sheet.shelves.reduce((sum, sh) => sum + sh.height, 0);

      // пытаемся положить на существующие полки
      for (const shelf of sheet.shelves) {
        if (w <= sheetWidth - shelf.x && h <= shelf.height) {
          shelf.x += w;
          placed = true;
          break;
        }
      }
      if (placed) break;

      // создаём новую полку, если по высоте помещается
      if (usedHeight + h <= sheetHeight) {
        sheet.shelves.push({ x: w, height: h });
        placed = true;
        break;
      }
    }

    // если нигде не влезло — новый лист
    if (!placed) {
      sheets.push({ shelves: [{ x: w, height: h }] });
    }
  });
  if(error) return error
  return sheets.length;
}

export default Calculate