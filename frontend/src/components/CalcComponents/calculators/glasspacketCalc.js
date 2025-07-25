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
        height, width, gas, plane1, plane2, customertype } = data
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
            value: selfcost.materials[material[0]].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло стеклопакет'],
            string: `${selfcost.materials[material[0]].value} * ${S.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло стеклопакет']}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло стеклопакет'
        });
        const context = { selfcost, result, thickness };
        constructWorks('cutting1', S, context);
        constructWorks('cutting2', S, context);
        if(material[1]){
            constructWorks('tempered', S, context);
            constructWorks('blunting', P, context);
        }
        !material[1] && material[3] && constructWorks('blunting', P, context);
        material[2] && constructWorks('curvedProcessing', P, context);
    }
    for(const plane of planes){
        const thickness = Number(plane.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1]) // Добавить толщина рамки
        allThickness += thickness
        result.materials.push({
            name: plane,
            value: selfcost.materials[plane].value * P * selfcost.pricesAndCoefs['Коэффициент обрези рамка'],
            string: `${selfcost.materials[plane].value} * ${P.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези рамка']}`,
            formula: 'Цена за 1м * Периметр * Коэффициент обрези рамка'
        });
        result.materials.push({
            name: `Уголок для газа без отверстия ${thickness} мм.`,
            value: selfcost.materials[`Уголок для газа без отверстия ${thickness} мм.`].value,
            string: `${selfcost.materials[`Уголок для газа без отверстия ${thickness} мм.`].value} * ${planes.length.toFixed(2)}`,
            formula: 'Цена за монтажный уголок'
        });
        result.materials.push({
            name: `Молекулярное сито (${thickness < 10 ? '0,5-0,9' : '1-2'})`,
            value: selfcost.materials[`Молекулярное сито (${thickness < 10 ? '0,5-0,9' : '1-2'})`].value * S * 15 * allThickness / 1000,
            string: `${selfcost.materials[`Молекулярное сито (${thickness < 10 ? '0,5-0,9' : '1-2'})`].value} * ${S} * 15 * ${allThickness} / 1000`,
            formula: 'Цена за влагопоглатитель (сито) * Площадь * 15 * Толщина всех рамок / Перевод в кг'
        });
    }
    weight += P * 12 * allThickness / 1000 //Вес вторичного герметика
    const name = `СП${planes.length == 1 ? 'О' : 'Д'}, ${allThickness}, ${shortenGlassName(materials[0][0], triplexShornNames)}, ${Number(plane1.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])}${gas ? `(${gas})` : ''}, ${shortenGlassName(materials[1][0], triplexShornNames)}${materials[2] ? `, ${Number(plane2.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])}${gas ? `(${gas})` : ''}, ${shortenGlassName(materials[2][0], triplexShornNames)}` : ''}, (${height}*${width})`
    // gas && result.materials.push({
    //     name: gas,
    //     value: selfcost.materials[gas].value * S * allPlaneThickness,
    //     string: `${selfcost.materials[gas].value} * ${S} * ${allPlaneThickness}`,
    //     formula: 'Цена за м² * Площадь * Толщина всех рамок'
    // });
    const context = { selfcost, result, allThickness, planes, P};
    constructWorks('sealing', planes.length, context);
    constructWorks('assembleGlasspacket', planes.length, context);
    constructWorks('assemblePlane', planes.length, context);
    constructMaterials(context)

    let materialsandworks = 0
    for (const item of Object.values(result.materials)) 
        materialsandworks += item.value
    for (const item of Object.values(result.works)) 
        materialsandworks += item.value
    const expenses = materialsandworks * 0.45
    result.expenses = [{
        name: 'Расходы',
        value: expenses,
        string: `${(materialsandworks).toFixed(2)} * 0.45`,
        formula: `(Материалы и работы) * 0.45`
    }]
    const price = (materialsandworks + expenses) * selfcost.pricesAndCoefs[`Стеклопакет ${customertype}`]
    result.finalPrice = [{
        name: 'Прямые затраты',
        value: materialsandworks + expenses,
        string: `${(materialsandworks).toFixed(2)} + ${(expenses).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы`
    },{
        name: 'Наценка',
        value: selfcost.pricesAndCoefs[`Стеклопакет ${customertype}`],
        string: selfcost.pricesAndCoefs[`Стеклопакет ${customertype}`],
        formula: `Наценка для типа клиента ${selfcost.pricesAndCoefs[`Стеклопакет ${customertype}`]}`
    }]
    result.other = {
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
        price,
        added: false,
        quantity: 1,
        initialData: data,
        result
    }
}

function constructMaterials(context){
    const { selfcost, result, planes, P, allThickness} = context;
    result.materials.push({
        name: 'Первичный герметик (бутил)',
        value: selfcost.materials['Первичный герметик (бутил)'].value * P * 8 * planes.length / 1000,
        string: `${selfcost.materials['Первичный герметик (бутил)'].value} * ${P.toFixed(2)} * 8 * ${planes.length.toFixed(2)} / 1000`,
        formula: 'Цена за первичный герметик (бутил) * Периметр * 8 * Количество дистанционных рамок / Перевод в кг'
    });
    result.materials.push({
        name: 'Вторичный герметик',
        value: selfcost.materials['Вторичный герметик'].value * (P * 12 * allThickness / 1000),
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