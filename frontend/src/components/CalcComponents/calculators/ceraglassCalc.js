import { constructWorks, constructName } from './triplexCalc.js'
const Calculate = (data, selfcost) => {
    console.log(data)
    console.log(selfcost)
    const { height, width, cutsv1, cutsv2, cutsv3, material1, material2, blank, color, under, quantity = 1, trim, tempered} = data
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
    let name = constructName(`Керагласс, ${materials.join(' + ')}`, {...data, polishing: true})
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
                value: selfcost.materials[material].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло'].value,
                calcValue: (selfcost.materials[material].calcValue * S) * selfcost.pricesAndCoefs['Коэффициент обрези стекло'].value,
                string: `${selfcost.materials[material].value} * ${S} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло'].value}`,
                formula: 'Цена * S * Коэффициент обрези стекло'
            });
            const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
            const context = { selfcost, result, thickness, stanok };
            constructWorks('cutting1', S, context);
            constructWorks('cutting2', S, context);
            tempered && constructWorks('tempered', S, context);
            constructWorks('curvedProcessing', P, context);
            continue
        }
        constructWorks('cuttingCera', S, context);
        if(material == 'Керамика клиента'){
            result.materials.push({
                name: material,
                value: 2200 * S,
                calcValue: 2200 * S,
                string: `2200 * ${S}`,
                formula: 'Цена * S'
            });
            continue
        }
        const sheetWidth = selfcost.materials[material].w, sheetHeight = selfcost.materials[material].l
        const S_cera = sheetHeight * sheetWidth / 1000000
        const parts = widths.map((w, i) => ({
            w,
            h: heights[i]
        }));
        let count = countSheets(sheetWidth, sheetHeight, parts)
        ceraTrim = 1 + (trim ?? (1 - S_all / (count * S_cera)))
        if(typeof count === 'string'){
            result.errors.push(count)
            count = 999
        }
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S * (ceraTrim + selfcost.pricesAndCoefs[`Коэффициент брака керамика`].value),
            calcValue: selfcost.materials[material].calcValue * S * (ceraTrim + selfcost.pricesAndCoefs[`Коэффициент брака керамика`].value),
            string: `${selfcost.materials[material].value} * ${S} * ${ceraTrim + selfcost.pricesAndCoefs[`Коэффициент брака керамика`].value}`,
            formula: 'Цена * S * (Коэффициент обрези керамика + Коэффициент брака керамика)'
        });
    }
    constructWorks('curvedProcessing', P_all, context);
    constructWorks('triplexing1', S_all * (materials.length - 1), context);
    constructWorks('triplexing2', S_all * (materials.length - 1), context);
    constructWorks('washing1', S_all * heights.length, context);
    constructWorks('otk', S_all * heights.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S_all, context);

    let materialsandworks = 0
    let calcmaterialsandworks = 0
    for (const item of Object.values(result.materials)){
        materialsandworks += item.value
        calcmaterialsandworks += item.calcValue || item.value
    }
    for (const item of Object.values(result.works)){
        materialsandworks += item.finalValue
        calcmaterialsandworks += item.finalValue
    }
    const underPrice = under && selfcost.unders[under].value || 0

    const gostPrice = 0
    const retailPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Керагласс Розница`].value + underPrice
    const bulkPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Керагласс Опт`].value + underPrice
    const dealerPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Керагласс Дилер`].value + underPrice
    const vipPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Керагласс ВИП`].value + underPrice
    result.finalPrice = [{
        name: 'Настоящая себестоимость',
        value: materialsandworks,
        string: `${(materialsandworks).toFixed(2)}`,
        formula: `Материалы и работы`
    },{
        name: 'Себестоимость калькулятора',
        value: calcmaterialsandworks,
        string: `${(calcmaterialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы (Себестоимость стекла берется "Тип цен для калькулятора")`
    },{
        name: 'Цена для Выше госта',
        value: gostPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Выше госта`]?.value} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта" + Подстолье`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Розница`].value} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница" + Подстолье`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Опт`].value} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт" + Подстолье`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс Дилер`].value} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер" + Подстолье`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Керагласс ВИП`].value} + ${underPrice}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП" + Подстолье`
    }]
    under && result.finalPrice.push({
        name: 'Подстолье',
        value: selfcost.unders[under].value,
        string: selfcost.unders[under].value,
        formula: `Цена подстолья`
    })
    result.other = {
        materialsandworks,
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