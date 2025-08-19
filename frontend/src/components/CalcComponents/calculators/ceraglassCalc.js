import { constructWorks, constructName } from './triplexCalc.js'
const Calculate = (data, selfcost) => {
    console.log(data)
    console.log(selfcost)
    const { height, width, cutsv1, cutsv2, cutsv3, material1, material2, blank, color, under, quantity = 1, trim} = data
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
    let ceraTrim = 0
    let weight = 0
    // let name = `Керагласс, ${materials.join(' + ')}, (${height}х${width}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}, площадь: ${(height * width / 1000000).toFixed(2)})`
    let name = constructName(`Керагласс, ${materials.join(' + ')}`, {...data})
    color && result.materials.push({
        name: color,
        value: selfcost.colors[color].value * 0.3,
        string: `${selfcost.colors[color].value} * 0.3`,
        formula: 'Цена * 0.3'
    });
    result.materials.push({
        name: 'Клей кераглас',
        count: Math.max(0.17 * S_all, 0.5),
        value: selfcost.materials[`Клей кераглас`].value * Math.max(0.17 * S_all, 0.5),
        string: `${selfcost.materials[`Клей кераглас`].value} * ${Math.max(0.17 * S_all, 0.5)}`,
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
        console.log(trim)
        ceraTrim = 1 + (trim ?? (1 - S_all / (count * S_cera)))
        if(typeof count === 'string'){
          result.errors.push(count)
          count = 999
        }
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S * (ceraTrim + selfcost.pricesAndCoefs[`Коэффициент брака керамика`]),
            string: `${selfcost.materials[material].value} * ${S} * ${ceraTrim + selfcost.pricesAndCoefs[`Коэффициент брака керамика`]}`,
            formula: 'Цена * S * (Коэффициент обрези керамика + Коэффициент брака керамика)'
        });
        constructWorks('cuttingCera', S, context);
    }
    constructWorks('curvedProcessing', P_all, context);
    constructWorks('lamination', S_all, context);
    constructWorks('washing1', S_all * heights.length, context);
    constructWorks('otk', S_all * heights.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S_all, context);

    let materialsandworks = 0
    for (const item of Object.values(result.materials))
        materialsandworks += item.value
    for (const item of Object.values(result.works))
        materialsandworks += item.finalValue
      
    const underPrice = under && selfcost.unders[under].value || 0

    const gostPrice = 0
    const retailPrice = materialsandworks * selfcost.pricesAndCoefs[`Керагласс Розница`] + underPrice
    const bulkPrice = materialsandworks * selfcost.pricesAndCoefs[`Керагласс Опт`] + underPrice
    const dealerPrice = materialsandworks * selfcost.pricesAndCoefs[`Керагласс Дилер`] + underPrice
    const vipPrice = materialsandworks * selfcost.pricesAndCoefs[`Керагласс ВИП`] + underPrice
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks,
        string: `${(materialsandworks).toFixed(2)}`,
        formula: `Материалы и работы`
    },{
        name: 'Цена для Выше госта',
        value: gostPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Выше госта`]} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта" + Подстолье`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Розница`]} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница" + Подстолье`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Опт`]} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт" + Подстолье`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Дилер`]} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер" + Подстолье`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс ВИП`]} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП" + Подстолье`
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
        materials,
        heights,
        widths,
        ceraTrim,
        weight
    }
    console.log(result)
    return {
        key: crypto.randomUUID(),
        name,
        prices: {
            gostPrice,
            retailPrice,
            bulkPrice,
            dealerPrice,
            vipPrice
        },
        added: false,
        quantity,
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