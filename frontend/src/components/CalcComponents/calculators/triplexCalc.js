const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding, color } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value);
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''})`
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
                        constructTape(S_tape, 'Пленка EVA Прозрачная 0,38 мм')
                        break
                    }
                    constructTape(S_tape, 'Пленка EVA Прозрачная 0,76 мм')
                break;

            case 'Смарт пленка Magic Glass':
                constructTape(S_tape, 'Смарт пленка Magic Glass')
                constructTape(S_tape * 2, 'Пленка EVA Прозрачная 0,76 мм')
                break;

            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                constructTape(S_tape, 'Пленка EVA №25 Хамелеон Гладкий 1.4')
                constructTape(S_tape * 2, 'Пленка EVA Прозрачная 0,38 мм')
                break;
            
            case 'Пленка EVA Прозрачная 0,38 мм':
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,38 мм')
                break;

            case 'Пленка EVA Прозрачная 0,76 мм':
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,76 мм')
                break;

            default:
                console.log(tape)
                constructTape(S_tape, tape)
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,38 мм')
                break;
        }

    }
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        allThickness += thickness
        weight += 2.5 * S * thickness
        
        tempered && constructWorks('tempered', S, { thickness, result, selfcost})
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
            string: `${selfcost.materials[material].value} * ${S.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло']}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло'
        });
    }
    const context = { selfcost, result, stanok, allThickness };
    constructWorks('cutting1', S * materials.length, context);
    constructWorks('cutting2', S * materials.length, context);
    constructWorks('washing1', S * materials.length, context);
    constructWorks('grinding', P * materials.length, context);
    constructWorks('otk', S * materials.length, context);
    constructWorks('triplexing', S * materials.length - 1, context);
    polishing && constructWorks('polishing', P * materials.length, context);
    drills && constructWorks('drills', drills * materials.length, context);
    zenk && constructWorks('zenk', zenk * materials.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S, context);

    const [materialsandworks, commercialExpenses, householdExpenses, workshopExpenses] = constructExpenses(result, selfcost)
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Триплекс ${customertype}`]
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks + commercialExpenses + householdExpenses + workshopExpenses,
        string: `${(materialsandworks).toFixed(2)} + ${(commercialExpenses + householdExpenses + workshopExpenses).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы`
    },{
        name: 'Наценка',
        value: selfcost.pricesAndCoefs[`Триплекс ${customertype}`],
        string: selfcost.pricesAndCoefs[`Триплекс ${customertype}`],
        formula: `Наценка для типа клиента ${selfcost.pricesAndCoefs[`Триплекс ${customertype}`]}`
    }]
    result.other = {
        S,
        S_tape,
        P,
        stanok,
        allThickness,
        weight,
        type: 'Триплекс',
        productType: true,
        viz: true,
        materialsandworks
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

export const constructWorks = (work, quantity, context) => {
    const { selfcost, result, stanok, thickness, allThickness } = context;
    console.log(work, quantity)
    const res = (name, tableName) => {
        result.works.push({
            name,
            value: (quantity * selfcost.pricesAndCoefs[tableName || name].costOfWork) + (selfcost.pricesAndCoefs[tableName || name].salary / selfcost.pricesAndCoefs['Среднее количество рабочих часов в месяц'] * quantity / selfcost.pricesAndCoefs[tableName || name].ratePerHour),
            string: `(${quantity} * ${selfcost.pricesAndCoefs[tableName || name].costOfWork}) + (${selfcost.pricesAndCoefs[tableName || name].salary} / ${selfcost.pricesAndCoefs['Среднее количество рабочих часов в месяц']} * ${quantity} / ${selfcost.pricesAndCoefs[tableName ||name].ratePerHour})`,
            formula: `(Количество * Сделка + (Оклад / Среднее количество рабочих часов в месяцe * Количество / Норма в час)`
        })
    }
    switch (work) {
        case 'drills': res('Сверление'); break
        case 'zenk': res('Зенковка'); break
        case 'cutsv1': res('Вырез в стекле 1 кат'); break
        case 'cutsv2': res('Вырез в стекле 2 кат'); break
        case 'cutsv3': res('Вырез в стекле 3 кат'); break
        case 'tempered': res(`Закалка ${thickness} мм`); break
        case 'cutting1': res('Резка (Управление)'); break
        case 'cutting2': res('Резка (Помощь)'); break
        case 'washing1': res('Мойка 1'); break
        case 'grinding': res('Шлифовка', stanok === 'Прямолинейка' ? 'Прямолинейная обработка' : 'Криволинейная обработка'); break
        case 'polishing': res('Полировка', stanok === 'Прямолинейка' ? 'Прямолинейная обработка' : 'Криволинейная обработка'); break
        case 'triplexing': res(`Триплекс ${allThickness} мм`); break
        case 'blunting': res(`Притупка`); break
        case 'otk': res(`ОТК`); break
        case 'sealing': res(`Герметизация`); break
        case 'assembleGlasspacket': res(`Сборка стеклопакета`); break
        case 'assemblePlane': res(`Изготовление рамки`); break
        case 'lamination': res(`Ламинирование`); break
        case 'cuttingCera': res(`Резка керамики`); break
        case 'color': res(`Окрашивание`); break
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