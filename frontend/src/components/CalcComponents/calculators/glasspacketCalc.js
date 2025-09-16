import triplexcalulator from './triplexCalc.js'
import { constructWorks } from './triplexCalc.js'
import sailEffectLimits from '../../../constants/sailEffectLimits.js'
const Calculate = (data, selfcost, triplexArray) => {
    console.log(data)
    console.log(selfcost)
    const {
        material1, material2, material3, 
        tempered1, tempered2, tempered3,
        polishing1, polishing2, polishing3,
        blunting1, blunting2, blunting3,
        height, width, gas, plane1, plane2, quantity = 1 } = data
    const materials = [
                    [material1, tempered1, polishing1, blunting1],
                    [material2, tempered2, polishing2, blunting2],
                    [material3, tempered3, polishing3, blunting3]
    ].filter(el => el[0])
    const planes = [plane1, plane2].filter(el => el)

    
    const S = (height * width) / 1000000
    const P = 2 * (height + width) / 1000
    let weight = 0
    let allThickness = 0
    let allPlaneThickness = 0
    const allWorks = {
        cutting1: 0,
        cutting2: 0,
        washing1: 0,
        otk: 0,
        tempered: 0,
        blunting: 0,
        sealing: 0,
        assembleGlasspacket: 0,
        assemblePlane: 0
    }
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {},
        errors: [],
        warnings: []
    }
    const triplexShornNames = {}
    let viz = false
    const triplexDataForSend = []
    const sailEffectIsOk = (glassThickness, area, triplex = false) => {
        let planeThickness = Number(planes[0].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        planeThickness > 18 && (planeThickness = 18)
        if(glassThickness > 6) return
        const key = `${planeThickness}|${glassThickness}|${ triplex ? 'false' : materials[0][1]}`;
        if (!(key in sailEffectLimits)) {
            result.warnings.push(`Нет данных для парусности ${key}`)
            return
        }
        const maxArea =  sailEffectLimits[key];
        const res = area <= maxArea
        if(!res){
            result.other.sailEffect = false
            result.warnings.push(`Парусность выше нормы, площадь стекла: ${area}, максимально допустимая: ${maxArea}`)
        }
    }
    let sailEffect = false
    for(const material of materials){
        if(material[0].toLowerCase().includes('триплекс')){
            viz = true
            const triplexObject = triplexArray.find(el => el.name == material[0])
            triplexDataForSend.push(triplexObject)
            const triplexcalc = triplexcalulator(triplexObject.values, selfcost)
            triplexShornNames[material[0]] = triplexcalc.result.other.spName
            result.materials.push({
                name: triplexcalc.name,
                value: triplexcalc.result.other.materialsandworks,
                string: `Себестоимость материалов и работ триплекса`,
                formula: 'Себестоимость материалов и работ триплекса'
            });
            if(!sailEffect){
                sailEffectIsOk(triplexcalc.result.other.shortThickness.join('+'), S, true)
                sailEffect = true
            }
            allThickness += triplexcalc.result.other.allThickness
            weight +=triplexcalc.result.other.weight
            continue
        }
        const thickness = Number(material[0].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        if(!sailEffect){
            sailEffectIsOk(thickness, S)
            sailEffect = true
        }
        allThickness += thickness
        weight += 2.5 * S * thickness
        result.materials.push({
            name: material[0],
            value: selfcost.materials[material[0]].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло стеклопакет'].value,
            calcValue: selfcost.materials[material[0]].calcValue * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло стеклопакет'].value,
            string: `${selfcost.materials[material[0]].value} * ${S.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло стеклопакет'].value}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло стеклопакет'
        });
        const context = { selfcost, result, thickness, spo: true };
        allWorks['cutting1'] += S
        allWorks['cutting2'] += S
        allWorks['washing1'] += S
        allWorks['otk'] += S
        if(material[1]){
            allWorks['tempered'] += S
            allWorks['blunting'] += P
        }
        !material[1] && material[3] && (allWorks['blunting'] += P)
        material[2] && (allWorks['curvedProcessing'] += P) // ЭТО ПОЛИРОВКА ТИПА НА КРИВОЛИНЕЙКЕ НАДО ЗАМЕНИТЬ
    }
    const allSito = {
        'Молекулярное сито (0,5-0,9)': 0,
        'Молекулярное сито (1-2)': 0,
    }
    const angles = {}
    for(const plane of planes){
        const thickness = Number(plane.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1]) // Добавить толщина рамки
        allThickness += thickness
        result.materials.push({
            name: plane,
            value: selfcost.materials[plane].value * P * selfcost.pricesAndCoefs['Коэффициент обрези рамка'].value,
            count: P * selfcost.pricesAndCoefs['Коэффициент обрези рамка'].value,
            string: `${selfcost.materials[plane].value} * ${P.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези рамка'].value}`,
            formula: 'Цена за 1м * Периметр * Коэффициент обрези рамка'
        });
        const sitoName = `Молекулярное сито (${thickness < 10 ? '0,5-0,9' : '1-2'})`
        allSito[sitoName] += thickness
        angles[thickness] = (angles[thickness] ?? 0) + 1;
    }
    for(const angle of Object.keys(angles)){
        result.materials.push({
            name: `Уголок для газа без отверстия ${angle} мм.`,
            value: selfcost.materials[`Уголок для газа без отверстия ${angle} мм.`].value,
            count: angles[angle],
            string: `${selfcost.materials[`Уголок для газа без отверстия ${angle} мм.`].value} * ${angles[angle].toFixed(2)}`,
            formula: 'Цена за монтажный уголок'
        })
    }
    for(const sito of Object.keys(allSito)){
        if(allSito[sito] > 0)
            result.materials.push({
                name: sito,
                value: selfcost.materials[sito].value * S * 15 * allSito[sito] / 1000,
                count: S * 15 * allSito[sito] / 1000,
                string: `${selfcost.materials[sito].value} * ${S} * 15 * ${allSito[sito]} / 1000`,
                formula: 'Цена за влагопоглатитель (сито) * Площадь * 15 * Толщина всех рамок / Перевод в кг'
            });
    }
    weight += P * 12 * allThickness / 1000 //Вес вторичного герметика
    const name = `СП${planes.length == 1 ? 'О' : 'Д'}, ${allThickness}, ${shortenGlassName(materials[0][0], triplexShornNames)}, ${Number(plane1.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])}${gas ? `(${gas})` : ''}, ${shortenGlassName(materials[1][0], triplexShornNames)}${materials[2] ? `, ${Number(plane2.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])}${gas ? `(${gas})` : ''}, ${shortenGlassName(materials[2][0], triplexShornNames)}` : ''}, (${height}*${width}, площадь: ${(height * width / 1000000).toFixed(2)})`
    // gas && result.materials.push({
    //     name: gas,
    //     value: selfcost.materials[gas].value * S * allPlaneThickness,
    //     string: `${selfcost.materials[gas].value} * ${S} * ${allPlaneThickness}`,
    //     formula: 'Цена за м² * Площадь * Толщина всех рамок'
    // });
    const context = { selfcost, result, allThickness, planes, P, spo: true};
    allWorks['sealing'] += planes.length
    allWorks['assembleGlasspacket'] += planes.length
    allWorks['assemblePlane'] += planes.length
    for(const work of Object.keys(allWorks)){
        if(allWorks[work] > 0)
            constructWorks(work, allWorks[work], context);
    }
    constructMaterials(context)

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
    const retailPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет Розница`].value
    const bulkPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет Опт`].value
    const dealerPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет Дилер`].value
    const vipPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет ВИП`].value
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
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Выше госта`]?.value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта"`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Розница`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница"`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Опт`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт"`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Дилер`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер"`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${materialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет ВИП`].value}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП"`
    }]
    result.other = {
        materialsandworks,
        S,
        allThickness,
        P,
        weight,
        productType: true,
        type: 'Стеклопакет',
        viz,
        materials
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

function constructMaterials(context){
    const { selfcost, result, planes, P, allThickness} = context;
    result.materials.push({
        name: 'Первичный герметик (бутил)',
        value: selfcost.materials['Первичный герметик (бутил)'].value * P * 8 * planes.length / 1000,
        count: P * 8 * planes.length / 1000,
        string: `${selfcost.materials['Первичный герметик (бутил)'].value} * ${P.toFixed(2)} * 8 * ${planes.length.toFixed(2)} / 1000`,
        formula: 'Цена за первичный герметик (бутил) * Периметр * 8 * Количество дистанционных рамок / Перевод в кг'
    });
    result.materials.push({
        name: 'Вторичный герметик',
        value: selfcost.materials['Вторичный герметик'].value * (P * 12 * allThickness / 1000),
        count: P * 12 * allThickness / 1000,
        string: `${selfcost.materials['Вторичный герметик'].value} * (${P.toFixed(2)} * 12 * ${allThickness.toFixed(2)} / 1000)`,
        formula: 'Цена за вторичный герметик * (Периметр * 12 * Толщина стеклопакета / Перевод в кг)'
    });
    // result.materials.push({
    //     name: 'Термоэтикетка',
    //     value: selfcost.materials['Термоэтикетка'].value * 2,
    //     string: `${selfcost.materials['Термоэтикетка'].value} * 2`,
    //     formula: 'Цена термоэтикетки 2шт'
    // });
}
export function shortenGlassName(fullName, triplexShornNames) {
    if(fullName.toLowerCase().includes('триплекс')){
        return triplexShornNames[fullName]
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

    return `${cleanedName} ${thickness}`;
}
export default Calculate