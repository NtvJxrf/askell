import checkDetail from './checkDetails.js'
import constructName from './constructName.js'
import constructWorks from './constructWorks.js'
const Calculate = (data, selfcost) => {
    const { height, width, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, rounding, processing, 
         color, quantity = 1, ignoreRestricts = false, trims = {} } = data
    
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value).map( el => {
        if(el === '-')
            return undefined
        else return el
    })
    const stanok = (shape && !cutsv1 && !cutsv2 && !cutsv3) ? 'Прямолинейка' : 'Криволинейка'
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
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
        warnings: [],
    }
    const resultTapes = []
    const shortThickness = []

    let S_tape = null
    if(larger <= 2100) S_tape = (2100 * lesser) / 1000000
    else S_tape = (2100 * larger) / 1000000    // Считаем площадь используемой пленки | 2100 это ширина рулона
    const constructTape = (quantity, name) => {
        resultTapes.push(name)
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
            case '':
            case undefined:
                    let useThinMaterial = false
                    for(const material of materials){
                        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
                        if(thickness <= 4) useThinMaterial = true
                    }
                    if(useThinMaterial || lesser < 1050){
                        constructTape(S_tape * 2, 'Пленка EVA Прозрачная 0,38 мм')
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
    let pack = 0
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        const currentWeight = 2.5 * ((height * width) / 1000000) * thickness
        weight += currentWeight
        ignoreRestricts || checkDetail({width, height, weight: currentWeight, tempered, material, stanok, result, thickness, type: 'Триплекс', selfcost, processing})
        shortThickness.push(thickness)
        allThickness += thickness
        allWeights.push(2.5 * ((height * width) / 1000000) * thickness)
        !material.includes('М1') && (pack = S_calc * 2 * 100 + S_calc * 100)
        tempered && constructWorks(`tempered${thickness}`, S_calc, { thickness, result, selfcost})
        
        stanok == 'Криволинейка' && processing == 'Шлифовка' && constructWorks('grindingCurved', P, { thickness, result, selfcost})
        stanok == 'Криволинейка' && processing == 'Полировка' && constructWorks('polishingCurved', P, { thickness, result, selfcost})
        stanok == 'Прямолинейка' && processing == 'Притупка' && constructWorks('bluntingStraight', P, { thickness, result, selfcost})
        stanok == 'Прямолинейка' && processing == 'Полировка' && constructWorks('polishingStraight', P, { thickness, result, selfcost})
        stanok == 'Прямолинейка' && processing == 'Шлифовка' && constructWorks('grindingStraight', P, { thickness, result, selfcost})
        let trimCoef = 999 //Не 0, чтобы если что увидеть сразу что что то не так
        if(trims[material]) trimCoef = trims[material]
        else{
            if(material.includes('М1')) trimCoef = selfcost.pricesAndCoefs['Коэффициент обрези стекло М1'].value
            else if(material.includes('Moru')) trimCoef = selfcost.pricesAndCoefs['Коэффициент обрези стекло Moru'].value
            else trimCoef = selfcost.pricesAndCoefs['Коэффициент обрези стекло Цветное'].value
        }

        result.materials.push({
            name: material,
            value: selfcost.materials[material].value * S_calc * trimCoef,
            calcValue: (selfcost.materials[material].calcValue * S_calc) * trimCoef,
            objectValue: (selfcost.materials[material].objectValue * S_calc) * trimCoef,
            string: `${selfcost.materials[material].value} * ${S_calc.toFixed(2)} * ${trimCoef}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло'
        });
    }
    const S_print = Math.max(print, 0.5)
    print && result.works.push({
                name: 'Печать',
                value: selfcost.pricesAndCoefs[`УФ печать триплекс`].value * S_print,
                finalValue: selfcost.pricesAndCoefs[`УФ печать триплекс`].value * S_print,
                string: `${selfcost.pricesAndCoefs[`УФ печать триплекс`].value} * ${S_print.toFixed(2)}`,
                formula: 'Cтоимость уф печати * S'
            })
    let name = constructName(`Триплекс, ${materials.join(' + ')}`, {...data, stanok})
    const context = { selfcost, result, stanok, allThickness };
    constructWorks('cutting1', S_calc * materials.length, context);
    constructWorks('cutting2', S_calc * materials.length, context);
    stanok == 'Криволинейка' ? constructWorks('curvedProcessing', P * materials.length, context) : constructWorks('straightProcessing', P * materials.length, context)
    stanok == 'Криволинейка' && constructWorks('washing1', S_calc * materials.length, context);
    constructWorks('otk', S_calc * materials.length, context);
    constructWorks('triplexing1', S_calc * (materials.length - 1), context);
    constructWorks('triplexing2', S_calc * (materials.length - 1), context);
    drills && constructWorks('drills', drills * materials.length, context);
    zenk && constructWorks('zenk', zenk * materials.length, context);
    cutsv1 && constructWorks('cutsv1', cutsv1 * materials.length, context);
    cutsv2 && constructWorks('cutsv2', cutsv2 * materials.length, context);
    cutsv3 && constructWorks('cutsv3', cutsv3 * materials.length, context);
    if(color){
        constructWorks('color', S_calc, context);
        result.materials.push({
            name: color,
            value: selfcost.colors[color].value * 0.3,
            count: 0.3,
            string: `${selfcost.colors[color].value} * 0.3`,
            formula: 'Цена за м² * 0.3'
        });
    }
    let materialsandworks = 0
    let calcmaterialsandworks = 0
    let objectmaterialsandworks = 0
    for (const item of Object.values(result.materials)){
        materialsandworks += item.value
        calcmaterialsandworks += item.calcValue || item.value
        objectmaterialsandworks += item.objectValue || item.value
    }
    for (const item of Object.values(result.works)){
        materialsandworks += item.finalValue
        calcmaterialsandworks += item.finalValue
        objectmaterialsandworks += item.finalValue
    }
    const calcmaterialsandworksBefore = calcmaterialsandworks
    const materialsandworksBefore = materialsandworks
    calcmaterialsandworks = calcmaterialsandworks * selfcost.pricesAndCoefs[`% брака для стекла`].value
    materialsandworks = materialsandworks * selfcost.pricesAndCoefs[`% брака для стекла`].value
    const gostPrice = 0
    const retailPrice = calcmaterialsandworks * (selfcost.pricesAndCoefs[`Триплекс Розница`].value) + pack
    const bulkPrice = calcmaterialsandworks * (selfcost.pricesAndCoefs[`Триплекс Опт`].value) + pack
    const dealerPrice = calcmaterialsandworks * (selfcost.pricesAndCoefs[`Триплекс Дилер`].value) + pack
    const vipPrice = calcmaterialsandworks * (selfcost.pricesAndCoefs[`Триплекс ВИП`].value) + pack
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks,
        string: `${(materialsandworksBefore).toFixed(2)} * ${selfcost.pricesAndCoefs[`% брака для стекла`].value}`,
        formula: `(Материалы и Работы + Расходы) * % брака`
    },{
        name: 'Себестоимость калькулятора',
        value: calcmaterialsandworks,
        string: `${(calcmaterialsandworksBefore).toFixed(2)} * ${selfcost.pricesAndCoefs[`% брака для стекла`].value}`,
        formula: `(Материалы + Работы + Расходы (Себестоимость стекла берется "Тип цен для калькулятора")) * % брака`
    },{
        name: 'Себестоимость калькулятора для объектов',
        value: objectmaterialsandworks,
        string: `${(objectmaterialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы (Себестоимость стекла берется "Цена для коммерческих объектов")`
    },{
        name: 'Цена для Выше госта',
        value: gostPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Выше госта`]?.value} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта" + Упаковка`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Розница`].value} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница" + Упаковка`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Опт`].value} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт" + Упаковка`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс Дилер`].value} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер" + Упаковка`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Триплекс ВИП`].value} + ${pack}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП" + Упаковка`
    }]
    pack && result.finalPrice.push({
        name: 'Упаковка',
        value: pack,
        string: `${pack.toFixed(2)}`,
        formula: `S * 2 * 100 + S * 100`
    })
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
        viz: false,
        materials,
        shortThickness,
        spName: materials.reduce((acc, curr) => {
            acc.push(shortenGlassName(curr))
            return acc
        }, []).join('.') + '.1',
        package: pack,
        resultTapes,
        trims
    }
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

export function shortenGlassName(fullName, triplexShortNames, tempered) {
    if(fullName.toLowerCase().includes('триплекс')){
        return triplexShortNames[fullName]
    }
    const adjectives = ['зеркальное', 'осветленное', 'тонированное', 'узорчатое'];

    const match = fullName.match(/^(?:Стекло|Зеркало)\s(.+?),\s*(\d+)\s*мм$/i);
    if (!match) return fullName;

    let [, name, thickness] = match;

    const nameWords = name.split(/\s+/);
    const cleanedWords = nameWords.filter(word => {
        const lower = word.toLowerCase();
        return !adjectives.includes(lower);
    });

    const cleanedName = cleanedWords.join(' ').trim();

    return `${cleanedName} ${thickness}${tempered ? ' зак' : ''}`;
}