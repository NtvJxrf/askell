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
    const constructTape = (quantity, name) => {
        result.materials.push({
            name,
            value: selfcost.materials[name].value * quantity,
            count: quantity,
            string: `${selfcost.materials[name].value} * ${quantity.toFixed(2)}`,
            formula: 'Цена за м² * Площадь плёнки'
        });
    }
    for (let tape of tapes) {
        tape === '-' && (tape = undefined)
        switch (tape) {
            case undefined:
                    let useThinMaterial = false
                    for(const material of materials){
                        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
                        if(thickness < 4) useThinMaterial = true
                    }
                    if(useThinMaterial || lesser < 1050){
                        constructTape(S_tape, 'Пленка EVA Прозрачная 0,38мм')
                        break
                    }
                    constructTape(S_tape, 'Пленка EVA Прозрачная 0,76мм')
                break;

            case 'Смарт пленка Magic Glass':
                constructTape(S_tape, 'Смарт пленка Magic Glass')
                constructTape(S_tape * 2, 'Пленка EVA Прозрачная 0,76мм')
                break;

            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                constructTape(S_tape, 'Пленка EVA №25 Хамелеон Гладкий 1.4')
                constructTape(S_tape * 2, 'Пленка EVA Прозрачная 0,38мм')
                break;
            
            case 'Пленка EVA Прозрачная 0,38мм':
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,38мм')
                break;

            case 'Пленка EVA Прозрачная 0,76мм':
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,76мм')
                break;

            default:
                console.log(tape)
                constructTape(S_tape, tape)
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,38мм')
                break;
        }

    }
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        allThickness += thickness
        weight += 2.5 * S * thickness
        
        tempered && constructWorks('tempered', {S, thickness, result, selfcost})
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
            string: `${selfcost.materials[material].value} * ${S.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло']}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло'
        });
    }
    const context = { works, selfcost, result, materials, P, stanok, S, allThickness };
    constructWorks('cutting1', context);
    constructWorks('cutting2', context);
    constructWorks('washing1', context);
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
        formula: `(Материалы и Работы + Расходы) * Наценка для типа клиента ${customertype}`,
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
            res(S, `Закалка ${thickness} мм`)
            break;
        case 'cutting1':
            res(S * materials.length, 'Резка (Управление)')
            break;
        case 'cutting2':
            res(S * materials.length, 'Резка (Помощь)')
            break;
        case 'washing1':
            res(S * materials.length, 'Мойка 1')
            break;
        case 'grinding':
            res(P * materials.length, 'Шлифовка', stanok === 'Прямолинейка' ? 'Прямолинейная обработка' : 'Криволинейная обработка')
            break;
        case 'polishing':
            res(stanok === 'Прямолинейка' ? 0 : P  * materials.length, 'Полировка', stanok === 'Прямолинейка' ? 'Прямолинейная обработка' : 'Криволинейная обработка')
            break
        case 'triplexing':
            res(S, `Триплекс ${allThickness} мм`)
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
        formula: `(Материалы и работы) * % цеховых расходов`
    })
    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${(materialsandworks ).toFixed(2)} + ${(workshopExpenses ).toFixed(2)}) * ${selfcost.pricesAndCoefs[`% коммерческих расходов`]}`,
        formula: `(Материалы и Работы + Цеховые) * % коммерческих расходов}`
    })
    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(materialsandworks ).toFixed(2)} + ${(workshopExpenses ).toFixed(2)}) * ${selfcost.pricesAndCoefs[`% общехозяйственных расходов`]}`,
        formula: `(Материалы и Работы + Цеховые) * % общехозяйственных расходов`
    })
    return [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses]
}
export default Calculate