const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value);
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    const works = { polishing, drills, zenk, cutsv1, cutsv2, print }
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
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
    const P = 2 * (height + width) / 1000
    let allThickness = 0
    let weight = 0
    const larger = Math.max(height, width)
    const lesser = Math.min(height, width)
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    //Если цветная пленка (Все остальные кроме смарт и хамелеон), то считать выбранную + 'Пленка EVA Прозрачная 0,38мм'
    //Если смарт, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,76мм'
    //Если хамелеон, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,38мм'
    //Себестоимость пленки будет S_tape * себестоимость пленок * кол-во
    let S_tape = null
    if(larger <= 2100) S_tape = (2100 * lesser) / 1000000
    else S_tape = (2100 * larger) / 1000000    // Считаем площадь используемой пленки | 2100 это ширина рулона
    for (const tape of tapes) {
        switch (tape) {
            case undefined:
                    let useThinMaterial = false
                    for(const material of materials){
                        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
                        if(thickness < 4) useThinMaterial = true
                    }
                    if(useThinMaterial || lesser < 1050){
                        result.materials.push({
                            name: 'Пленка EVA Прозрачная 0,38мм',
                            value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].value * S_tape,
                            count: S_tape,
                            string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].value} * ${S_tape.toFixed(2)}`,
                            formula: 'Цена за м² * Площадь плёнки'
                        });
                        break
                    }
                    result.materials.push({
                        name: 'Пленка EVA Прозрачная 0,76мм',
                        value: selfcost.materials['Пленка EVA Прозрачная 0,76мм'].value * S_tape,
                        count: S_tape,
                        string: `${selfcost.materials['Пленка EVA Прозрачная 0,76мм'].value} * ${S_tape.toFixed(2)}`,
                        formula: 'Цена за м² * Площадь плёнки'
                    });
                break;

            case 'Смарт пленка Magic Glass':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].value} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,76мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,76мм'].value * S_tape * 2,
                    count: S_tape * 2,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,76мм'].value} * ${S_tape.toFixed(2)} * 2`,
                    formula: 'Цена за м² * Площадь плёнки * 2 слоя'
                });
                break;

            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].value} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,38мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].value * S_tape * 2,
                    count: S_tape * 2,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].value} * ${S_tape.toFixed(2)} * 2`,
                    formula: 'Цена за м² * Площадь плёнки * 2 слоя'
                });
                break;
            
            case 'Пленка EVA Прозрачная 0,38мм':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].value} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                break;

            case 'Пленка EVA Прозрачная 0,76мм':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].value} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                break;

            default:
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].value} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,38мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].value} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                break;
        }

    }
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        allThickness += thickness
        weight += 2.5 * S * thickness
        
        tempered && result.works.push({
                name: `Закалка ${thickness} мм`,
                value: selfcost.pricesAndCoefs[`Закалка ${thickness}`] * S,
                string: `${selfcost.pricesAndCoefs[`Закалка ${thickness}`]}мм * ${S}`,
                formula: `Себестоимость закалки * площадь`
            });
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S,
            string: `${selfcost.materials[material].value} * ${S.toFixed(2)}`,
            formula: 'Цена за м² * Площадь'
        });
    }
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const context = { works, selfcost, result, materials, P, stanok, S, allThickness };
    constructWorks('cutting', context);
    constructWorks('washing', context);
    constructWorks('grinding', context);
    constructWorks('triplexing', context);
    for (const work in works) {
        if(!works[work]) continue
        constructWorks(work, context);
    }

    const [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses] = constructExpenses(result, selfcost)
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Триплекс ${customertype}`]
    result.finalPrice = {
        name: 'Итоговая цена',
        string: `(${(materialsandworks).toFixed(2)} + ${((commercialExpenses + householdExpenses + workshopExpenses)).toFixed(2)}) * ${selfcost.pricesAndCoefs[`Триплекс ${customertype}`]}`,
        formula: `(Материалы + Работы + Расходы) * Наценка для типа клиента ${customertype}`,
        value: price
    }
    result.other = {
        S,
        S_tape,
        P,
        stanok,
        allThickness,
        weight,
        type: 'Триплекс',
        productType: true,
        viz: true
    }
    console.log(result)
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

export const constructWorks = (work, context) => {
    const { works, selfcost, result, materials, P, stanok, thickness, S, allThickness } = context;
    const res = (quantity, name, tableName) => {
        result.works.push({
            name,
            value: (quantity * selfcost.pricesAndCoefs[tableName || name].costOfWork) + (selfcost.pricesAndCoefs['Средний оклад по селькоровской'] / selfcost.pricesAndCoefs['Среднее количество рабочих часов в месяц'] * quantity / selfcost.pricesAndCoefs[tableName || name].ratePerHour),
            string: `(${quantity} * ${selfcost.pricesAndCoefs[tableName || name].costOfWork}) + (${selfcost.pricesAndCoefs['Средний оклад по селькоровской']} / ${selfcost.pricesAndCoefs['Среднее количество рабочих часов в месяц']} * ${quantity} / ${selfcost.pricesAndCoefs[tableName ||name].ratePerHour})`,
            formula: `(Количество * стоимость работы) + (Средний оклад по селькоровской / Среднее количество рабочих часов в месяц * Количество / Норма в час)`
        })
    }
    switch (work) {
        case 'drills':
            res(works[work] * materials.length, 'Сверление')
            break;
        case 'zenk':
            res(works[work] * materials.length, 'Зенковка')
            break;
        case 'cutsv1':
            res(works[work] * materials.length, 'Вырез в стекле 1 кат')
            break;
        case 'cutsv2':
            res(works[work] * materials.length, 'Вырез в стекле 2 кат')
            break;
        case 'cutsv3':
            res(works[work] * materials.length, 'Вырез в стекле 3 кат')
            break;
        case 'tempered':
            res(S, 'Закалка')
            break;
        case 'cutting1':
            res(S, 'Резка (Управление)')
            break;
        case 'cutting2':
            res(S, 'Резка (Помощь)')
            break;
        case 'washing1':
            res(S, 'Мойка 1')
            break;
        case 'grinding':
            res(P, 'Шлифовка', stanok === 'Прямолинейка' ? 'Прямолинейная обработка' : 'Криволинейная обработка')
            break;
        case 'polishing':
            res(stanok === 'Прямолинейка' ? 0 : P, 'Полировка', stanok === 'Прямолинейка' ? 'Прямолинейная обработка' : 'Криволинейная обработка')
            break
        case 'triplexing':
            result.works.push({
                name: 'Триплексование',
                value: selfcost.pricesAndCoefs[`Триплекс ${allThickness} мм`],
                string: `${selfcost.pricesAndCoefs[`Триплекс ${allThickness} мм`].toFixed(2)}`,
                formula: `Фиксированная себестоимость триплексования для общей толщины (${allThickness})`
            })
            break
    }
};
export const constructExpenses = (result, selfcost) => {
    let materialsandworks = 0
    for (const item of Object.values(result.materials)) 
        materialsandworks += item.value
    for (const item of Object.values(result.works)) 
        materialsandworks += item.value
    const workshopExpenses = materialsandworks * selfcost.pricesAndCoefs[`% цеховых расходов`]   // % цеховых расходов
    const commercialExpenses = (materialsandworks + workshopExpenses) * selfcost.pricesAndCoefs[`% коммерческих расходов`] // % коммерческих расходов
    const householdExpenses =  (materialsandworks + workshopExpenses) * selfcost.pricesAndCoefs[`% общехозяйственных расходов`] // % общехозяйственных расходов
    result.expenses.push({
        name: 'Цеховые расходы',
        value: workshopExpenses,
        string: `${(materialsandworks ).toFixed(2)} * ${selfcost.pricesAndCoefs[`% цеховых расходов`]}`,
        formula: `(Материалы + работы) * % цеховых расходов`
    })
    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${(materialsandworks ).toFixed(2)} + ${(workshopExpenses ).toFixed(2)}) * ${selfcost.pricesAndCoefs[`% коммерческих расходов`]}`,
        formula: `(Материалы + Работы + Цеховые) * % коммерческих расходов}`
    })
    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(materialsandworks ).toFixed(2)} + ${(workshopExpenses ).toFixed(2)}) * ${selfcost.pricesAndCoefs[`% общехозяйственных расходов`]}`,
        formula: `(Материалы + Работы + Цеховые) * % общехозяйственных расходов`
    })
    return [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses]
}
export default Calculate