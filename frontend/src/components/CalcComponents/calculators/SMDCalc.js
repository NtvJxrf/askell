import { constructWorks } from './triplexCalc'
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, cuts, smdType, color, rounds, drillssmd, clientType, print, rounding } = data
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    const works = { cuts, drillssmd }
    const S = (height * width) / 1000000
    const thickness = Number(material.match(/\d+/)[0])
    let weight = S * 2.5 * thickness
    let name = `Доска стеклянная магнитно-маркерная ASKELL ${smdType === 'Иное' ? 'Size' : smdType} (${height}х${width}), ${material}${color ? `, ${color}` : ''}${print ? `, УФ печать` : ''}${cuts ? `, Вырезы: ${cuts}` : ''}`
    const straightTypes = ['Lux', 'Standart', 'Krystal']
    const larger = Math.max(height, width)
    const stanok = (straightTypes.includes(smdType), larger > 2500 && cuts == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    let temp = 0
    if(S >= 1.2){
        result.materials.push({
                name: `Цена для типа клиента ${clientType}`,
                value: selfcost.pricesAndCoefs[`${clientType} S >= 1.2`] * S,
                string: `${(selfcost.pricesAndCoefs[`${clientType} S >= 1.2`]).toFixed(2)} * ${S.toFixed(2)}`,
                formula: `Цена для типа клиента ${clientType} при S >= 1.2 * S`
            });
            temp = selfcost.pricesAndCoefs[`${clientType} S >= 1.2`] * S
    }else{
        result.materials.push({
                name: 'Цена для типа клиента',
                value: selfcost.pricesAndCoefs[`${clientType} S < 1.2`] * S,
                string: `${(selfcost.pricesAndCoefs[`${clientType} S < 1.2`]).toFixed(2)} * ${S.toFixed(2)}`,
                formula: `Цена для типа клиента ${clientType} при S < 1.2 * S`
            });
            temp = selfcost.pricesAndCoefs[`${clientType} S < 1.2`] * S
    }
    const coef = temp * 0.2  // 20% коэфицент какой то

    smdType != 'Krystal' && print && (result.works.push({
                                        name: 'УФ печать',
                                        value: coef,
                                        string: `${(temp).toFixed(2)} * ${0.2}`,
                                        formula: `Если тип не Krystal и есть печать, то + 20% к цене`
                                    }))
    
    rounds > 0 && (result.works.push({
        name: 'Скругления',
        value: coef,
        string: `${temp} * ${0.2}`,
        formula: 'Если есть скругления, то + 20% к цене'
    }))
    switch (material) {
        case 'Стекло Matelux, 4 мм':
            result.materials.push({
                name: material,
                value: coef,
                string: `${(temp).toFixed(2)} * ${0.2}`,
                formula: 'Если материал Matelux, то + 20% к цене'
            });
            break
        case 'Стекло осветленное OptiWhite, 4 мм':
            result.materials.push({
                name: material,
                value: selfcost.pricesAndCoefs[`Optiwhite SMD`] * S,
                string: `${(selfcost.pricesAndCoefs[`Optiwhite SMD`]).toFixed(2)} * ${S.toFixed(2)}`,
                formula: 'Цена за Optiwhite * Площадь'
            });
            break
    }
    const materials = [material]
    const context = { works, selfcost, result, materials, stanok, S };
    for (const work in works) {
        if (!work) continue;
        constructWorks(work, context);
    }

    let materialsandworks = 0
    for (const item of Object.values(result.materials)) {
        materialsandworks += item.value
    }
    for (const item of Object.values(result.works)) {
        materialsandworks += item.value
    }
    const price = materialsandworks
    result.finalPrice = {
        name: 'Итоговая цена',
        string: `${(materialsandworks).toFixed(2)}}`,
        formula: `Материалы и Работы`,
        value: price
    }
    result.other = {
        S,
        stanok,
        weight,
        productType: true,
        type: 'СМД'
    }
    return {
            key: crypto.randomUUID(),
            name,
            price,
            added: false,
            quantity: 1,
            initialData: data,
            result
    }
}

export default Calculate