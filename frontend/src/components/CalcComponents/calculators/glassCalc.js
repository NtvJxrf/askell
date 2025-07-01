import { constructWorks, constructExpenses } from './triplexCalc'

const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, color, print, customertype, rounding } = data
    const works = { tempered, polishing, drills, zenk, cutsv1, cutsv2, print }
    let S = (height * width) / 1000000
    if(S < 0.5){
        switch (rounding){
            case 'Округление до 0.5':
                S = 0.5
            break
            case 'Умножить на 2':
                S = S * 2
            break
        }
    }
    const P = ((height + width) * 2) / 1000
    const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
    let weight = S * 2.5 * thickness
    let name = `${material} (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const result = {
        materials: [],
        works: [],
        expenses: [],
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
                string: `${selfcost.pricesAndCoefs[`УФ печать`]}`,
                formula: 'Себестоимость уф печати'
            });
    const materials = [material]
    const context = { works, selfcost, result, P, stanok, materials, thickness, S};
    constructWorks('cutting1', context);
    constructWorks('cutting2', context);
    constructWorks('washing1', context);
    constructWorks('grinding', context);
    for(const work in works){
        if(!works[work]) continue
        constructWorks(work, context)
    }
    const [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses] = constructExpenses(result, selfcost)
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Стекло ${customertype}`]
    result.finalPrice = {
        name: 'Итоговая цена',
        string: `(${(materialsandworks).toFixed(2)} + ${((commercialExpenses + householdExpenses + workshopExpenses)).toFixed(2)}) * ${selfcost.pricesAndCoefs[`Стекло ${customertype}`]}`,
        formula: `(Материалы и Работы + Расходы) * Наценка для типа клиента ${customertype}`,
        value: price
    }

    result.other = {
        S,
        P,
        stanok,
        weight,
        type: 'Стекло',
        productType: true,
        viz: (color || print) ? true : false
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