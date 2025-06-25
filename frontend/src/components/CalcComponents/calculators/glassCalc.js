import { constructWorks } from './triplexCalc'
import { randomUUID } from 'crypto';

const key = randomUUID();

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
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const result = {
        materials: [],
        works: [],
        expenses: [],
    }

    result.materials.push({
        name: material,
        value: selfcost.materials[material].value * S,
        string: `${selfcost.materials[material].value} * ${S.toFixed(2)}`,
        formula: 'Цена за м² * Площадь'
    });
    color && result.materials.push({
        name: color,
        value: selfcost.colors[color].value * 0.3,
        string: `${selfcost.colors[color].value} * 0.3`,
        formula: 'Цена за м² * 0.3'
    });
    const materials = [material]
    const context = { works, selfcost, result, P, stanok, materials, thickness, S };
    constructWorks('cutting', context);
    constructWorks('washing1', context);
    // constructWorks('grinding', context);
    for(const work in works){
        if(!work) continue
        constructWorks(work, context)
    }

    let materialsandworks = 0
    for (const item of Object.values(result.materials)) {
        materialsandworks += item.value
    }
    for (const item of Object.values(result.works)) {
        materialsandworks += item.value
    }
    const workshopExpenses = materialsandworks * 0.48   // % цеховых расходов
    const commercialExpenses = (materialsandworks + workshopExpenses) * 0.064 // % коммерческих расходов
    const householdExpenses =  (materialsandworks + workshopExpenses) * 0.2525 //общехозяйственные расходы

    result.expenses.push({
        name: 'Цеховые расходы',
        value: workshopExpenses,
        string: `${materialsandworks} * 0.48`,
        formula: 'Материалы + работы * 48%'
    });

    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${materialsandworks} + ${workshopExpenses}) * 0.064`,
        formula: '(Материалы + Работы + Цеховые) * 6.4%'
    });

    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${materialsandworks} + ${workshopExpenses}) * 0.2525`,
        formula: '(Материалы + Работы + Цеховые) * 25.25%'
    });
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Стекло ${customertype}`]

    result.finalPrice = {
        name: 'Итоговая цена',
        string: `(${materialsandworks} + ${(commercialExpenses + householdExpenses + workshopExpenses)}) * ${selfcost.pricesAndCoefs[`Стекло ${customertype}`]}`,
        formula: `(Материалы + Работы + Расходы) * Наценка для типа клиента ${customertype}`,
        value: price
    }

    result.other = {
        S,
        P,
        stanok,
        weight,
        type: 'Стекло',
        productType: true,
        viz: (color || print)
    }
    return {
        key: randomUUID(),
        name,
        price,
        added: false,
        quantity: 1,
        initialData: data,
        result
    }
}

export default Calculate



//площадь *( себес Стекло (зеркало) )* коэф.обрези+ стоимость Полуфабрикат краски выбранной (себес)*2 *0,3*площадь+ площадь*(стоимость краски печатной*0,048+RAL 9003 (Белый)себес *0,3)
// 0.3 = это норматив краски на 1м2
// уф печать делается на стороне, как ее включить в расчеты?

