import { constructWorks } from './triplexCalc'
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, cuts, type, color, rounds, drills, clientType, print, rounding, trim } = data
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    const works = { cuts, drills }
    const map = {
        'VIP': [1450000, 2650000],
        'Дилер': [1650000, 3050000],
        'Опт': [1850000, 3400000],
        'Розница': [2100000, 3800000],
        'Optiwhite': 600000
    }
    const S = (height * width) / 1000000
    const thickness = Number(material.match(/\d+/)[0])
    let weight = S * 2.5 * thickness
    let name = `Доска стеклянная магнитно-маркерная ASKELL ${type === 'Иное' ? 'Size' : type} (${height}х${width}), ${material}${color ? `, ${color}` : ''}${print ? `, УФ печать` : ''}${cuts ? `, Вырезы: ${cuts}` : ''}`
    const straightTypes = ['Lux', 'Standart', 'Krystal']
    const larger = Math.max(height, width)
    const stanok = (straightTypes.includes(type), larger > 2500 && cuts == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    let temp = 0
    if(S >= 1.2){
        result.materials.push({
                name: 'Цена для типа клиента',
                value: map[clientType][0] * S,
                string: `${(map[clientType][0] / 100).toFixed(2)} * ${S.toFixed(2)}`,
                formula: `Цена для типа клиента ${clientType} при S >= 1.2 * S`
            });
            temp = map[clientType][0] * S
    }else{
        result.materials.push({
                name: 'Цена для типа клиента',
                value: map[clientType][1] * S,
                string: `${(map[clientType][1] / 100).toFixed(2)} * ${S.toFixed(2)}`,
                formula: `Цена для типа клиента ${clientType} при S < 1.2 * S`
            });
            temp = map[clientType][1] * S
    }
    const coef = temp * 0.2  // 20% коэфицент какой то

    type != 'Krystal' && print && (result.works.push({
                                        name: 'УФ печать',
                                        value: coef,
                                        string: `${(temp / 100).toFixed(2)} * ${0.2}`,
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
                string: `${(temp / 100).toFixed(2)} * ${0.2}`,
                formula: 'Если материал Matelux, то + 20% к цене'
            });
            break
        case 'Стекло осветленное OptiWhite, 4 мм':
            result.materials.push({
                name: material,
                value: map['Optiwhite'] * S,
                string: `${map['Optiwhite'].toFixed(2)} * ${S.toFixed(2)}`,
                formula: 'Цена за Optiwhite * Площадь'
            });
            price += coef
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
    result.other = {
        S,
        trim,
        stanok,
        weight,
        productType: true,
        type: 'СМД'
    }
    return {
            key: Date.now(),
            name,
            price,
            added: false,
            quantity: 1,
            initialData: data,
            selfcost,
            result
    }
}

export default Calculate