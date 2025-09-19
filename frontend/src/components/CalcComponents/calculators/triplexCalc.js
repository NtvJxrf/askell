import store from "../../../store.js"
import { shortenGlassName } from "./glasspacketCalc.js"
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, rounding, color, quantity = 1 } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value).map( el => {
        if(el === '-')
            return undefined
        else return el
    })
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    // let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}, площадь: ${(height * width / 1000000).toFixed(2)})`
    let S = (height * width) / 1000000
    let S_calc = S
    if (S < 0.3 && rounding == 'Округление до 0.3') {
        S_calc = 0.3
    } else if (S < 0.5) {
        switch (rounding) {
            case 'Округление до 0.5':
                S_calc = 0.5
                break
            case 'Умножить на 2':
                S_calc = S * 2
                break
        }
    }
    const P = 2 * (height + width) / 1000
    let allThickness = 0
    let weight = 0
    const allWeights = []
    const larger = Math.max(height, width)
    const lesser = Math.min(height, width)
    const result = {
        materials: [],
        calcMaterials: [],
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

            case 'Многослойная смарт-пленка White':
                constructTape(S_tape, 'Многослойная смарт-пленка White')
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
                constructTape(S_tape, tape)
                constructTape(S_tape, 'Пленка EVA Прозрачная 0,38 мм')
                break;
        }

    }
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        const currentWeight = 2.5 * ((height * width) / 1000000) * thickness
        weight += currentWeight
        const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && !currentWeight > 50) ? 'Прямолинейка' : 'Криволинейка'
        checkDetail({width, height, weight: currentWeight, tempered, material, stanok, result, thickness})
        shortThickness.push(thickness)
        allThickness += thickness
        allWeights.push(2.5 * ((height * width) / 1000000) * thickness)
        
        tempered && constructWorks('tempered', S_calc, { thickness, result, selfcost})
        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S_calc * selfcost.pricesAndCoefs['Коэффициент обрези стекло'].value,
            calcValue: (selfcost.materials[material].calcValue * S_calc) * selfcost.pricesAndCoefs['Коэффициент обрези стекло'].value,
            string: `${selfcost.materials[material].value} * ${S_calc.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло'].value}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло'
        });
    }
    switch (print){
        case 'С 1 стороны': result.works.push({
            name: 'Печать',
            value: selfcost.pricesAndCoefs[`УФ печать`].value * S_calc,
            finalValue: selfcost.pricesAndCoefs[`УФ печать`].value * S_calc,
            string: `${selfcost.pricesAndCoefs[`УФ печать`].value} * ${S_calc.toFixed(2)}`,
            formula: 'Себестоимость уф печати * S'
        }); break
        case 'С 2 сторон': result.works.push({
            name: 'Печать',
            value: selfcost.pricesAndCoefs[`УФ печать`].value * S_calc * 2,
            finalValue: selfcost.pricesAndCoefs[`УФ печать`].value * S_calc * 2,
            string: `${selfcost.pricesAndCoefs[`УФ печать`].value} * ${S_calc.toFixed(2)} * 2`,
            formula: 'Себестоимость уф печати * S * 2'
        }); break
    }
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3 && !allWeights.some(w => w > 50)) ? 'Прямолинейка' : 'Криволинейка'
    let name = constructName(`Триплекс, ${materials.join(' + ')}`, {...data, stanok})
    const context = { selfcost, result, stanok, allThickness };
    constructWorks('cutting1', S_calc * materials.length, context);
    constructWorks('cutting2', S_calc * materials.length, context);
    stanok == 'Криволинейка' ? constructWorks('curvedProcessing', P * materials.length, context) : constructWorks('straightProcessing', P * materials.length, context)
    constructWorks('washing1', S_calc * materials.length, context);
    constructWorks('otk', S_calc * materials.length, context);
    constructWorks('triplexing1', S_calc * (materials.length - 1), context);
    constructWorks('triplexing2', S_calc * (materials.length - 1), context);
    drills && constructWorks('drills', drills * materials.length, context);
    zenk && constructWorks('zenk', zenk * materials.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    color && constructWorks('color', S_calc, context);
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

    const gostPrice = 0
    const retailPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Триплекс Розница`].value
    const bulkPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Триплекс Опт`].value
    const dealerPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Триплекс Дилер`].value
    const vipPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Триплекс ВИП`].value
    result.finalPrice = [{
        name: 'Себестоимость',
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
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Выше госта`]?.value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта"`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Розница`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница"`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Опт`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт"`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Дилер`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер"`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс ВИП`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП"`
    }]
    result.other = {
        materialsandworks,
        calcmaterialsandworks,
        S,
        S_tape,
        P,
        stanok,
        allThickness,
        weight,
        type: 'Триплекс',
        productType: true,
        viz: true,
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

export const constructWorks = (work, quantity, context) => {
    const { selfcost, result, thickness, spo } = context;
    const res = (name, tableName) => {
        const PAC = selfcost.pricesAndCoefs
        const value = (quantity * PAC[tableName || name].costOfWork) 
        + (PAC[tableName || name].salary / PAC['Среднее количество рабочих часов в месяц'].value * quantity / PAC[tableName || name].ratePerHour)
        const place = PAC[name].place
        const workshopExpenses = value * (spo ? 0.45 : PAC[`% цеховых расходов ${place}`].value)
        const commercialExpenses = value * (spo ? 0.45 : name.toLowerCase().includes('триплекс') ? PAC[`% коммерческих расходов Селькоровская`].value : PAC[`% коммерческих расходов ${place}`].value)
        const householdExpenses = value * (spo ? 0.45 : PAC[`% общехозяйственных расходов ${place}`].value)
        result.works.push({
            name,
            finalValue: value + workshopExpenses + commercialExpenses + householdExpenses,
            value,
            workshopExpenses,
            commercialExpenses,
            householdExpenses,
            string: `(${quantity.toFixed(2)} * ${PAC[tableName || name].costOfWork}) + (${PAC[tableName || name].salary} / ${PAC['Среднее количество рабочих часов в месяц'].value} * ${quantity.toFixed(2)} / ${PAC[tableName ||name].ratePerHour})`,
            formula: `(Количество * Сделка + (Оклад / Среднее количество рабочих часов в месяцe * Количество / Норма в час)`
        })
    }
    switch (work) {
        case 'drills': res('Сверление'); break
        case 'zenk': res('Зенковка'); break
        case 'cutsv1': res('Вырез в стекле 1 кат'); break
        case 'cutsv2': res('Вырез в стекле 2 кат'); break
        case 'cutsv3': res('Вырез в стекле 3 кат'); break
        case 'tempered': res(`Закалка`); break
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
export const constructName = (firstWord, data) => {
    const {
    height,
    width,
    stanok,
    polishing = false,
    tempered = false,
    cutsv1 = 0,
    cutsv2 = 0,
    cutsv3 = 0,
    drills = 0,
    zenk = 0,
    print = false,
    color = false,
    } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value).map( el => {
        if(el === '-')
            return undefined
        else return el
    }).filter(Boolean)
    const parts = [];
    if(stanok) stanok == 'Прямолинейка' ? parts.push('ПР') : parts.push('КР')
    if (polishing) parts.push('Полировка')
        else parts.push('Шлифовка') 
    if (tempered) parts.push('Закаленное');
    if (cutsv1) parts.push(`Вырезы 1 кат.: ${cutsv1}`);
    if (cutsv2) parts.push(`Вырезы 2 кат.: ${cutsv2}`);
    if (cutsv3) parts.push(`Вырезы 3 кат.: ${cutsv3}`);
    if (drills) parts.push(`Сверление: ${drills}`);
    if (zenk) parts.push(`Зенкование: ${zenk}`);
    if (print) parts.push('УФ Печать');
    if (color) parts.push(`Окрашивание: ${color}`);
    if (tapes.length > 0) parts.push(`Пленка: ${tapes.join(';').replaceAll('Пленка', '')}`);
    const area = ((height * width) / 1_000_000).toFixed(2);
    if(!firstWord.includes('Керагласс')) parts.push(`площадь: ${area}`)
    return `${firstWord}, (${width}х${height}${parts.length > 0 ? ', ' : ''}${parts.join(', ')})`;
};
export const checkDetail = ({width, height, tempered, material, stanok, result, thickness}) => {
    const largest = Math.max(height, width);
    const lowest = Math.min(height, width);
    const S = (height * width) / 1000000
    if (tempered) {
        if (largest > 3000 || lowest > 1700)
            throw new Error(`Размер стекла превышает допустимые значения для закалки. Максимум: 3000x1700, получено: ${width}x${height}`);
        if (S < 0.07)
            throw new Error(`Размер стекла для закалки слишком мал. Минимальные допустимые размеры: S > 0.07, получено: ${S}`);
        if (largest < 350)
            throw new Error(`Большая сторона слишком мала. Минимальные допустимые размеры: 350, получено: ${largest}`);
        if(material.toLowerCase().includes('зеркало'))
            throw new Error('Зеркало не может быть закаленным')
        if ([8, 10, 12].includes(thickness) && largest > 1500)
            result.warnings.push(`Изделия с толщиной ${thickness} мм и большей стороной > 1500 мм на данный момент не могут быть изготовлены без привлечения сторонней закалки`);
        if ([4, 5, 6].includes(thickness) && largest > 2000)
            result.warnings.push(`Изделия с толщиной ${thickness} мм и большей стороной > 2000 мм на данный момент не могут быть изготовлены без привлечения сторонней закалки`);
    }
    if(stanok == 'Прямолинейка'){
        if(lowest < 40)
            throw new Error('Минимальный размер одной из сторон на прямолинейке 40 мм')
    }
    if(stanok == 'Криволинейка'){
        const largest = Math.max(width, height);
        const lowest = Math.min(width, height);
        if (largest < 400 || lowest < 250)
            throw new Error(`Размер стекла для криволинейки слишком мал. Минимальные допустимые размеры: 400x250, получено: ${width}x${height}`);

        const machines = [
            { name: "Alpa", maxWidth: 3200, maxHeight: 2200 },
            { name: "Intermac", maxWidth: 3700, maxHeight: 1900 }
        ]
        const suitableMachines = machines.filter(machine => 
            largest <= machine.maxWidth && lowest <= machine.maxHeight
        );

        if (suitableMachines.length === 0) {
            throw new Error('Стекло не подходит по максимальным размерам ни к одному станку на криволинейке');
        }
    }
}
export const getValue = (part, str) => {
    const selfcost = store.getState().selfcost.selfcost
    return selfcost[part][str].value
}
export default Calculate


// Сделал следующие ограничения для проверки деталей:
// Для закалки:
//     Максимальный размер: 3000×1700 мм.
//     Минимальный размер: 350×200 мм.
//     Зеркала не могут быть закаленными.
//     Толщина 8, 10, 12 и большая сторона > 1500(Только предупреждение)
//     Толщина 4, 5, 6 и большая сторона > 2000(Только предупреждение)
// Для станка «Прямолинейка»:
//     Минимальная сторона детали: 40 мм.

// Для станка «Криволинейка»:
//     Минимальные размеры: 400×250 мм.
//     Максимальные размеры зависят от станка:
//      Alpa: 3200×2200 мм
//      Intermac: 3700×1900 мм
//      Если деталь превышает размеры всех станков — она не подходит для обработки на криволинейке.