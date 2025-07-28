import { shortenGlassName } from "./glasspacketCalc.js"
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding, color } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value);
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''})`
    let S = (height * width) / 1000000
    if(S < 0.5)
        switch (rounding){
            case 'Округление до 0.5': S = 0.5; break
            case 'Умножить на 2': S = S * 2; break
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
        other: {},
        errors: [],
        warnings: []
    }
    const shortThickness = []
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
        shortThickness.push(thickness)
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
    print && result.works.push({
        name: 'Печать',
        value: selfcost.pricesAndCoefs[`УФ печать`],
        string: `${selfcost.pricesAndCoefs[`УФ печать`]}`,
        formula: 'Себестоимость уф печати'
    });
    const context = { selfcost, result, stanok, allThickness };
    constructWorks('cutting1', S * materials.length, context);
    constructWorks('cutting2', S * materials.length, context);
    constructWorks('washing1', S * materials.length, context);
    stanok == 'Криволинейка' ? constructWorks('curvedProcessing', P * materials.length, context) : constructWorks('straightProcessing', P * materials.length, context)
    constructWorks('otk', S * materials.length, context);
    constructWorks('triplexing1', S * materials.length - 1, context);
    constructWorks('triplexing2', S * materials.length - 1, context);
    drills && constructWorks('drills', drills * materials.length, context);
    zenk && constructWorks('zenk', zenk * materials.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S, context);
    let materialsandworks
    for (const item of Object.values(result.materials)) 
        materialsandworks += item.value
    for (const item of Object.values(result.works))
        materialsandworks += item.value
    const price = materialsandworks * selfcost.pricesAndCoefs[`Триплекс ${customertype}`]
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks,
        string: `${(materialsandworks).toFixed(2)}`,
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
        materialsandworks,
        materials,
        shortThickness,
        spName: materials.reduce((acc, curr) => {
            acc.push(shortenGlassName(curr))
            return acc
        }, []).join('.') + '.1'
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

export const constructWorks = (work, quantity, context) => {
    const { selfcost, result, stanok, thickness, allThickness } = context;
    const res = (name, tableName) => {
        const PAC = selfcost.pricesAndCoefs
        const value = (quantity * PAC[tableName || name].costOfWork) 
        + (PAC[tableName || name].salary / PAC['Среднее количество рабочих часов в месяц'] * quantity / PAC[tableName || name].ratePerHour)
        const place = PAC[name].place
        const workshopExpenses = value * PAC[`% цеховых расходов ${place}`]
        const commercialExpenses = value * (name.toLowerCase().includes('триплекс') ? PAC[`% коммерческих расходов Селькоровская`] : PAC[`% коммерческих расходов ${place}`])
        const householdExpenses = value * PAC[`% общехозяйственных расходов ${place}`]
        result.works.push({
            name,
            finalValue: value + workshopExpenses + commercialExpenses + householdExpenses,
            value,
            workshopExpenses,
            commercialExpenses,
            householdExpenses,
            string: `(${quantity} * ${PAC[tableName || name].costOfWork}) + (${PAC[tableName || name].salary} / ${PAC['Среднее количество рабочих часов в месяц']} * ${quantity} / ${PAC[tableName ||name].ratePerHour})`,
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
        case 'straightProcessing': res('Прямолинейная обработка'); break
        case 'curvedProcessing': res('Криволинейная обработка'); break
        case 'triplexing1': res(`Триплекс зачистка`); break
        case 'triplexing2': res(`Триплекс сборка`); break
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
    let materials = 0, worksViz = 0, worksSelk = 0, worksShield = 0
    for (const item of Object.values(result.materials)) 
        materials += item.value
    for (const item of Object.values(result.works)){
        const place = selfcost.pricesAndCoefs[item.name].place
        switch(place){
            case 'Селькоровская': worksSelk += item.value; break
            case 'ВИЗ': worksViz += item.value; break
            case 'Горный щит': worksShield += item.value; break
        }
    }
    const workshopExpensesViz = worksViz * selfcost.pricesAndCoefs[`% цеховых расходов ВИЗ`] // % цеховых расходов
    const workshopExpensesSelk = worksSelk * selfcost.pricesAndCoefs[`% цеховых расходов Селькоровская`] // % цеховых расходов
    const commercialExpensesViz = worksViz * selfcost.pricesAndCoefs[`% коммерческих расходов ВИЗ`] // % коммерческих расходов
    const commercialExpensesSelk = worksSelk * selfcost.pricesAndCoefs[`% коммерческих расходов Селькоровская`] // % коммерческих расходов
    const householdExpenses =  worksViz + worksSelk * selfcost.pricesAndCoefs[`% общехозяйственных расходов Селькоровская`] // % общехозяйственных расходов
    result.expenses.push({
        name: 'Цеховые расходы ВИЗ',
        value: workshopExpensesViz,
        string: `${(worksViz).toFixed(2)} * ${selfcost.pricesAndCoefs[`% цеховых расходов ВИЗ`]}`,
        formula: `Работы * % цеховых расходов`
    })
    result.expenses.push({
        name: 'Цеховые расходы Селькоровская',
        value: workshopExpensesSelk,
        string: `${(worksSelk).toFixed(2)} * ${selfcost.pricesAndCoefs[`% цеховых расходов Селькоровская`]}`,
        formula: `Работы * % цеховых расходов`
    })
    result.expenses.push({
        name: 'Коммерческие расходы ВИЗ',
        value: commercialExpensesViz,
        string: `(${(worksViz).toFixed(2)} * ${selfcost.pricesAndCoefs[`% коммерческих расходов ВИЗ`]}`,
        formula: `(Материалы и Работы + Цеховые) * % коммерческих расходов}`
    })
    result.expenses.push({
        name: 'Коммерческие расходы ВИЗ',
        value: commercialExpensesSelk,
        string: `(${(worksSelk).toFixed(2)} * ${selfcost.pricesAndCoefs[`% коммерческих расходов Селькоровская`]}`,
        formula: `(Материалы и Работы + Цеховые) * % коммерческих расходов}`
    })
    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(worksViz + worksSelk).toFixed(2)} * ${selfcost.pricesAndCoefs[`% общехозяйственных расходов Селькоровская`]}`,
        formula: `Работы * % общехозяйственных расходов`
    })
    return [materials + worksViz + worksSelk + worksShield]
}
export default Calculate