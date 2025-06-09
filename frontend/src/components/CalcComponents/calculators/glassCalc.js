const Calculate = (data, selfcost) => {
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, print, customertype, rounding, trim } = data
    const works = { tempered, polishing, drills, zenk, cutsv1, cutsv2 }
    let S = (height * width) / 1000000
    const P = ((height + width) * 2) / 1000
    const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
    let weight = S * 2.5 * thickness
    let name = `${material}(${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    result.works.push({
        name: 'Раскрой',
        value: selfcost.works[`Раскрой стекла`],
        string: `${(selfcost.works[`Раскрой стекла`] / 100).toFixed(2)}`,
        formula: 'Раскрой стекла'
    });

    result.works.push({
        name: 'Мойка',
        value: selfcost.works[`Мойка`],
        string: `${(selfcost.works[`Мойка`] / 100).toFixed(2)}`,
        formula: 'Мойка'
    });

    result.works.push({
        name: 'Шлифовка',
        value: selfcost.works[`${stanok} Шлифовка`] * P,
        string: `${(selfcost.works[`${stanok} Шлифовка`] / 100).toFixed(2)} * ${P.toFixed(2)}`,
        formula: 'Себестоимость работы * Периметр'
    });
    result.materials.push({
        name: material,
        value: selfcost.materials[material].salePrices[0].value * S * trim,
        string: `${selfcost.materials[material].salePrices[0].value / 100} * ${S.toFixed(2)} * ${trim}`,
        formula: 'Цена за м² * Площадь * Коэффициент обрези'
    });
    tempered && result.works.push({
                    name: `Закалка ${thickness} мм`,
                    value: selfcost.works[`Закалка ${thickness}`] * S,
                    string: `${selfcost.works[`Закалка ${thickness}`] / 100} * ${S}`,
                    formula: `Себестоимость закалки * площадь`
            });
    const context = { works, selfcost, result, P, stanok };
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
        string: `${(materialsandworks / 100).toFixed(2)} * 0.48`,
        formula: 'Материалы + работы * 48%'
    });

    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * 0.064`,
        formula: '(Материалы + Работы + Цеховые) * 6.4%'
    });

    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * 0.2525`,
        formula: '(Материалы + Работы + Цеховые) * 25.25%'
    });
    const price = workshopExpenses + commercialExpenses + householdExpenses + materialsandworks

    result.other = {
        S,
        P,
        trim,
        stanok,
        weight,
        type: 'Стекло',
        productType: true,
        viz: true
    }
    console.log(result)
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



const constructWorks = (work, context)=> {
    const { works, selfcost, result, P, stanok } = context;

    switch (work) {
        case 'polishing':
            if (works[work]) {
                result.works.push({
                    name: 'Полировка',
                    value: selfcost.works[`${stanok} Полировка`] * P,
                    string: `${selfcost.works[`${stanok} Полировка`] / 100} * ${P.toFixed(2)}`,
                    formula: 'Себестоимость работы * Периметр'
                });
            }
            break;

        case 'drills':
            result.works.push({
                name: 'Сверление',
                value: selfcost.works['Сверление стекла, керамики'] * works[work],
                string: `${selfcost.works['Сверление стекла, керамики'] / 100} * ${works[work]}`,
                formula: 'Себестоимость работы * Кол-во отверстий'
            });
            break;

        case 'zenk':
            result.works.push({
                name: 'Зенковка',
                value: selfcost.works['Зенковка'] * works[work],
                string: `${selfcost.works['Зенковка'] / 100} * ${works[work]}`,
                formula: 'Себестоимость зенковки * Кол-во зенковок'
            });
            break;

        case 'cutsv1':
            result.works.push({
                name: 'Вырез в стекле 1 кат',
                value: selfcost.works['Вырез в стекле 1 кат'] * works[work],
                string: `${selfcost.works['Вырез в стекле 1 кат'] / 100} * ${works[work]}`,
                formula: 'Себестоимость выреза 1 кат * Кол-во вырезов'
            });
            break;

        case 'cutsv2':
            result.works.push({
                name: 'Вырез в стекле 2 кат',
                value: selfcost.works['Вырез в стекле 2 кат'] * works[work],
                string: `${selfcost.works['Вырез в стекле 2 кат'] / 100} * ${works[work]}`,
                formula: 'Себестоимость выреза 2 кат * Кол-во вырезов'
            });
            break;

        case 'cutsv3':
            result.works.push({
                name: 'Вырез в стекле 3 кат',
                value: selfcost.works['Вырез в стекле 3 кат'] * works[work],
                string: `${selfcost.works['Вырез в стекле 3 кат'] / 100}  * ${works[work]}`,
                formula: 'Себестоимость выреза 3 кат * Кол-во вырезов'
            });
            break;
    }
}




//площадь *( себес Стекло (зеркало) )* коэф.обрези+ стоимость Полуфабрикат краски выбранной (себес)*2 *0,3*площадь+ площадь*(стоимость краски печатной*0,048+RAL 9003 (Белый)себес *0,3)
// 0.3 = это норматив краски на 1м2
// уф печать делается на стороне, как ее включить в расчеты?

