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
            constructWorks('grinding', P, context);
            constructWorks('polishing', P, context);
            continue
        }
        const sheetW = 1000;
        const sheetH = 3000;
        const parts = [
            { w: 800, h: 1000 },
            { w: 300, h: 1000 },
            { w: 1001, h: 1001 },
        ];
        // const sheetsNeeded = countSheets(sheetW, sheetH, parts, true); // с поворотом
        // console.log("Листов нужно:", sheetsNeeded);
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S * selfcost.pricesAndCoefs['Коэффициент обрези керамика'],
            string: `${selfcost.materials[material].value} * ${S} * ${selfcost.pricesAndCoefs['Коэффициент обрези керамика']}`,
            formula: 'Цена * S * Коэффициент обрези керамика'
        });
        constructWorks('cuttingCera', S, context);
    }
    constructWorks('grinding', P_all, context);
    constructWorks('polishing', P_all, context);
    constructWorks('lamination', S_all, context);
    constructWorks('washing1', S_all * heights.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S_all, context);
    const [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses] = constructExpenses(result, selfcost)
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Керагласс ${customertype}`]
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks + commercialExpenses + householdExpenses + workshopExpenses,
        string: `${(materialsandworks).toFixed(2)} + ${(commercialExpenses + householdExpenses + workshopExpenses).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы`
    },{
        name: 'Наценка',
        value: selfcost.pricesAndCoefs[`Керагласс ${customertype}`],
        string: selfcost.pricesAndCoefs[`Керагласс ${customertype}`],
        formula: `Наценка для типа клиента ${selfcost.pricesAndCoefs[`Керагласс ${customertype}`]}`
    }]
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

function countSheets(sheetW, sheetH, parts, allowRotation = false) {
  const cloneParts = parts.map(p => ({ ...p }));
  let remaining = [...cloneParts];
  let sheets = 0;

  while (remaining.length > 0) {
    sheets++;
    const result = fitInSheet(sheetW, sheetH, remaining, allowRotation);
    remaining = result.remaining;
  }

  return sheets;
}

function fitInSheet(sheetW, sheetH, parts, allowRotation) {
  let spaces = [{ x: 0, y: 0, w: sheetW, h: sheetH }];
  const fitted = [];
  const unfitted = [];

  for (const part of parts) {
    let placed = false;

    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];
      const variants = allowRotation
        ? [
            { w: part.w, h: part.h },
            { w: part.h, h: part.w }
          ]
        : [{ w: part.w, h: part.h }];

      for (const v of variants) {
        if (v.w <= space.w && v.h <= space.h) {
          // Размещаем
          part.x = space.x;
          part.y = space.y;
          part.w = v.w;
          part.h = v.h;
          fitted.push(part);

          // Разбиваем свободное пространство
          const newSpaces = [
            { x: space.x + v.w, y: space.y, w: space.w - v.w, h: v.h },
            { x: space.x, y: space.y + v.h, w: space.w, h: space.h - v.h }
          ];

          // Заменяем использованное пространство
          spaces.splice(i, 1);
          spaces.push(...newSpaces.filter(s => s.w > 0 && s.h > 0));
          placed = true;
          break;
        }
      }

      if (placed) break;
    }

    if (!placed) {
      unfitted.push(part);
    }
  }

  return { fitted, remaining: unfitted };
}


export default Calculate