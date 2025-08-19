import { constructWorks, constructExpenses, constructName } from './triplexCalc'

const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, color, print, rounding, quantity = 1 } = data
    let S = (height * width) / 1000000
    if(S < 0.5){
        switch (rounding){
            case 'Округление до 0.5': S = 0.5; break
            case 'Умножить на 2': S = S * 2; break
        }
    }
    const P = ((height + width) * 2) / 1000
    const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
    let weight = (height * width) / 1000000 * 2.5 * thickness
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    let name = constructName(material, {...data, stanok})
    // ЧЕ ТО ПРО ВЕС ГОВОРИЛ РУСЛАН, НА НОВОМ ПРОИЗВОДСТВЕ, ЧТО ЕСЛИ ВЕС БОЛЬШОЙ НА КУДА ТО В ДРУГОЙ СТАНОК
    const result = {
        materials: [],
        calcMaterials: [],
        works: [],
        expenses: [],
        errors: [],
        warnings: []
    }
    result.materials.push({
        name: material,
        value: (selfcost.materials[material].value * S) * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
        calcValue: (selfcost.materials[material].calcValue * S) * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
        string: `(${selfcost.materials[material].value} * ${S.toFixed(2)}) * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло']}`,
        formula: '(Цена за м² * Площадь) * Коэффициент обрези стекло'
    });
    color && result.materials.push({
        name: color,
        value: selfcost.colors[color].value * 0.3,
        string: `${selfcost.colors[color].value} * 0.3`,
        formula: 'Цена за м² * 0.3'
    });
    switch (print){
        case 'С 1 стороны': result.works.push({
            name: 'Печать',
            value: selfcost.pricesAndCoefs[`УФ печать`] * S,
            finalValue: selfcost.pricesAndCoefs[`УФ печать`] * S,
            string: `${selfcost.pricesAndCoefs[`УФ печать`]} * ${S.toFixed(2)}`,
            formula: 'Себестоимость уф печати * S'
        }); break
        case 'С 2 сторон': result.works.push({
            name: 'Печать',
            value: selfcost.pricesAndCoefs[`УФ печать`] * S * 2,
            finalValue: selfcost.pricesAndCoefs[`УФ печать`] * S * 2,
            string: `${selfcost.pricesAndCoefs[`УФ печать`]} * ${S.toFixed(2)} * 2`,
            formula: 'Себестоимость уф печати * S * 2'
        }); break
    }
    const context = { selfcost, result, thickness};
    constructWorks('cutting1', S, context);
    constructWorks('cutting2', S, context);
    constructWorks('washing1', S, context);
    constructWorks('otk', S, context);
    stanok == 'Криволинейка' ? constructWorks('curvedProcessing', P, context) : constructWorks('straightProcessing', P, context)
    drills && constructWorks('drills', drills, context);
    zenk && constructWorks('zenk', zenk, context);
    tempered && constructWorks('tempered', S, context);
    cutsv1 && constructWorks('cutsv1', cutsv1, context);
    cutsv2 && constructWorks('cutsv2', cutsv2, context);
    cutsv3 && constructWorks('cutsv3', cutsv3, context);
    color && constructWorks('color', S, context);

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
    const pack = (!material.includes('М1') ? (S * 2 * 100 + S * 100) : 0)

    const gostPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стекло Выше госта`] + pack
    const retailPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стекло Розница`] + pack
    const bulkPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стекло Опт`] + pack
    const dealerPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стекло Дилер`] + pack
    const vipPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стекло ВИП`] + pack
    result.finalPrice = [{
        name: 'Настоящая себестоимость',
        value: materialsandworks,
        string: `${(materialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы`
    },{
        name: 'Себестоимость калькулятора',
        value: calcmaterialsandworks,
        string: `${(calcmaterialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы (Себестоимость стекла берется "Тип цен для калькулятора")`
    },{
        name: 'Цена для Выше госта',
        value: gostPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стекло Выше госта`]} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта" + Упаковка`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стекло Розница`]} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница" + Упаковка`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стекло Опт`]} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт" + Упаковка`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стекло Дилер`]} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер" + Упаковка`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стекло ВИП`]} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП" + Упаковка`
    }]
    !material.includes('М1') && result.finalPrice.push({
        name: 'Упаковка',
        value: (S * 2 * 100 + S * 100),
        string: `${((S * 2 * 100 + S * 100)).toFixed(2)}`,
        formula: `Площадь * 100`
    })
    result.other = {
        S,
        P,
        stanok,
        weight,
        type: 'Стекло',
        productType: true,
        viz: (color || print) ? true : false,
        materials: [material],
        package: !material.includes('М1') ? true : false
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

export default Calculate