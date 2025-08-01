import { constructWorks, constructExpenses } from './triplexCalc'

const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, color, print, customertype, rounding, quantity = 1 } = data
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
    let name = `${material} (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''}, площадь: ${(height * width / 1000000).toFixed(2)})`
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    // ЧЕ ТО ПРО ВЕС ГОВОРИЛ РУСЛАН, НА НОВОМ ПРОИЗВОДСТВЕ, ЧТО ЕСЛИ ВЕС БОЛЬШОЙ НА КУДА ТО В ДРУГОЙ СТАНОК
    const result = {
        materials: [],
        works: [],
        expenses: [],
        errors: [],
        warnings: []
    }

    result.materials.push({
        name: material,
        value: (selfcost.materials[material].value * S) * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
        string: `(${selfcost.materials[material].value} * ${S.toFixed(2)}) * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло']}`,
        formula: '(Цена за м² * Площадь) * Коэффициент обрези стекло'
    });
    color && result.materials.push({
        name: color,
        value: selfcost.colors[color].value * 0.3,
        string: `${selfcost.colors[color].value} * 0.3`,
        formula: 'Цена за м² * 0.3'
    });
    print && result.works.push({
        name: 'Печать',
        value: selfcost.pricesAndCoefs[`УФ печать`],
        finalValue: selfcost.pricesAndCoefs[`УФ печать`],
        string: `${selfcost.pricesAndCoefs[`УФ печать`]}`,
        formula: 'Себестоимость уф печати'
    });
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
    for (const item of Object.values(result.materials))
        materialsandworks += item.value
    for (const item of Object.values(result.works))
        materialsandworks += item.finalValue
    const price = materialsandworks * selfcost.pricesAndCoefs[`Стекло ${customertype}`]
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks,
        string: `${(materialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы`
    },{
        name: 'Наценка',
        value: selfcost.pricesAndCoefs[`Стекло ${customertype}`],
        string: selfcost.pricesAndCoefs[`Стекло ${customertype}`],
        formula: `Наценка для типа клиента ${selfcost.pricesAndCoefs[`Стекло ${customertype}`]}`
    }]

    result.other = {
        S,
        P,
        stanok,
        weight,
        type: 'Стекло',
        productType: true,
        viz: (color || print) ? true : false,
        materials: [material]
    }
    return {
        key: crypto.randomUUID(),
        name,
        price,
        added: false,
        quantity,
        initialData: data,
        result
    }
}

export default Calculate