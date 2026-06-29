import triplexcalulator from './triplex.js'
import checkDetail from './checkDetails.js'
import constructWorks from './constructWorks.js'
// import sailEffectLimits from '../../../constants/sailEffectLimits.js'
const Calculate = (data, selfcost, triplexArray, messageApi) => {
    const {
        material1, material2, material3, 
        tempered1, tempered2, tempered3,
        processing1, processing2, processing3,
        color1, color2, color3,
        height, width, gas, plane1, plane2, quantity = 1, ignoreRestricts = false, shape, trims = {}, sealant} = data
    const materials = [
                    [material1, tempered1, processing1, color1],
                    [material2, tempered2, processing2, color2],
                    [material3, tempered3, processing3, color3]
    ].filter(el => el[0])
    const planes = [plane1, plane2].filter(el => el)

    const stanok = shape ? 'Прямолинейка' : 'Криволинейка'
    const S = (height * width) / 1000000
    let S_calc = S
    if(S < 0.5){
        S_calc = 0.5
    }
    const P = 2 * (height + width) / 1000
    let weight = 0
    let allThickness = 0
    let allPlaneThickness = 0
    const allWorks = {
        color: 0,
        cutting1: 0,
        cutting2: 0,
        polishingStraight: 0,
        grindingStraight: 0,
        bluntingStraight: 0,
        bluntingLowE: 0,
        tempered4: 0,
        tempered5: 0,
        tempered6: 0,
        tempered8: 0,
        tempered10: 0,
        tempered12: 0,
        assemblePlane: 0,
        sealing: 0,
        assembleGlasspacket: 0,
        sealing2: 0,
        otk: 0,
    }
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {},
        errors: [],
        warnings: []
    }
    const triplexShortNames = {}
    let viz = false
    const triplexDataForSend = []
    const sailEffectIsOk = (glassThickness, area, triplex = false) => {
        let planeThickness = Number(planes[0].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        planeThickness > 18 && (planeThickness = 18)
        if(glassThickness > 6) return
        // const key = `${planeThickness}|${glassThickness}|${ triplex ? 'false' : materials[0][1]}`;
        // if (!(key in sailEffectLimits)) {
        //     result.warnings.push(`Нет данных для парусности ${key}`)
        //     return
        // }
        // const maxArea =  sailEffectLimits[key];
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
            triplexShortNames[material[0]] = triplexcalc.result.other.spName
            result.materials.push({
                name: triplexcalc.name,
                value: triplexcalc.result.other.materialsandworks,
                string: `Себестоимость материалов и работ триплекса`,
                formula: 'Себестоимость материалов и работ триплекса'
            });
            if(!sailEffect){
                sailEffectIsOk(triplexcalc.result.other.shortThickness.join('+'), S_calc, true)
                sailEffect = true
            }
            allThickness += triplexcalc.result.other.allThickness
            weight +=triplexcalc.result.other.weight
            continue
        }
        const thickness = Number(material[0].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        if(!sailEffect){
            sailEffectIsOk(thickness, S_calc)
            sailEffect = true
        }
        ignoreRestricts || checkDetail({...data, stanok, processing: material[2], type: 'Стеклопакет', selfcost, material: material[0]}, messageApi)
        allThickness += thickness
        weight += 2.5 * S_calc * thickness
        let trimCoef = 999
        if(trims[material[0]]) trimCoef = trims[material[0]]
        else{
            if(material[0].includes('М1')) trimCoef = selfcost.pricesAndCoefs['Коэффициент обрези стекло М1'].value
            else if(material[0].includes('Moru')) trimCoef = selfcost.pricesAndCoefs['Коэффициент обрези стекло Moru'].value
            else trimCoef = selfcost.pricesAndCoefs['Коэффициент обрези стекло Цветное'].value
        }
        result.materials.push({
            name: material[0],
            value: selfcost.materials[material[0]].value * S_calc * trimCoef,
            calcValue: selfcost.materials[material[0]].calcValue * S_calc * trimCoef,
            objectValue: selfcost.materials[material[0]].objectValue * S_calc * trimCoef,
            string: `${selfcost.materials[material[0]].value} * ${S_calc.toFixed(2)} * ${trimCoef}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло стеклопакет'
        });
        allWorks['cutting1'] += S_calc
        allWorks['cutting2'] += S_calc
        if(material[3]){
            allWorks.color += S_calc
            result.materials.push({
                name: material[3],
                value: selfcost.colors[material[3]].value * 0.3,
                count: 0.3,
                string: `${selfcost.colors[material[3]].value} * 0.3`,
                formula: 'Цена за м² * 0.3'
            });
        }
        material[1] && (allWorks[`tempered${thickness}`] += S_calc);
        ({
            'Притупка': () => {
                if(material[0].split(' ').includes('И') || material[0].includes('MF')){
                    allWorks.bluntingLowE += P
                    return
                }
                allWorks.bluntingStraight += P
            },
            'Полировка': () => allWorks.polishingStraight += P,
            'Шлифовка': () => allWorks.grindingStraight += P
        }[material[2]]?.())
    }
    const allSito = {
        'Молекулярное сито (0,5-0,9)': 0,
        'Молекулярное сито (1-2)': 0,
    }
    const angles = {}
    for(const plane of planes){
        const thickness = Number(plane.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1]) // Добавить толщина рамки
        allPlaneThickness += thickness
        allThickness += thickness
        result.materials.push({//Для рамки был еще % обрези, пока убрал тк НАДО КАК У МАРИНЫ (selfcost.pricesAndCoefs['Коэффициент обрези рамка'].value)
            name: plane,
            value: selfcost.materials[plane].value * P,
            count: P,
            string: `${selfcost.materials[plane].value} * ${P.toFixed(2)}`,
            formula: 'Цена за 1м * Периметр'
        });
        const sitoName = `Молекулярное сито (0,5-0,9)`//(${thickness < 10 ? '0,5-0,9' : '1-2'}) Было так, Руслан 10.04.26 сказал оставить только 0.5-0.9
        allSito[sitoName] += thickness
        angles[thickness] = (angles[thickness] ?? 0) + 1;
    }
    for(const angle of Object.keys(angles)){
        result.materials.push({
            name: `Уголок для газа без отверстия ${angle} мм.`,
            value: selfcost.materials[`Уголок для газа без отверстия ${angle} мм.`].value,
            count: angles[angle],
            string: `${selfcost.materials[`Уголок для газа без отверстия ${angle} мм.`].value} * ${angles[angle].toFixed(2)}`,
            formula: 'Цена за монтажный уголок * Количество'
        })
    }
    for(const sito of Object.keys(allSito)){
        if(allSito[sito] > 0)
            result.materials.push({
                name: sito,
                value: selfcost.materials[sito].value * S_calc * 15 * allSito[sito] / 1000,
                count: S_calc * 15 * allSito[sito] / 1000,
                string: `${selfcost.materials[sito].value} * ${S_calc} * 15 * ${allSito[sito]} / 1000`,
                formula: 'Цена за влагопоглатитель (сито) * Площадь * 15 * Толщина всех рамок / Перевод в кг'
            });
    }
    weight += P * 8 * allThickness / 1000 //Вес вторичного герметика
    const name = `СП${planes.length == 1 ? 'О' : 'Д'}, ${allThickness}, ${shortenGlassName(materials[0][0], triplexShortNames, materials[0][1])}${materials[0][3] ? ` ${materials[0][3]}` : ''}, ${Number(plane1.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])} ${plane1.includes('алюминиевая') ? 'алюм' : 'черная'}${gas ? `(${gas})` : ''}, ${shortenGlassName(materials[1][0], triplexShortNames, materials[1][1])}${materials[1][3] ? ` ${materials[1][3]}` : ''}${materials[2] ? `, ${Number(plane2.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])} ${plane1.includes('алюминиевая') ? 'алюм' : 'черная'}${gas ? `(${gas})` : ''}, ${shortenGlassName(materials[2][0], triplexShortNames, materials[2][1])}${materials[2][3] ? ` ${materials[2][3]}` : ''}` : ''}, (${width}х${height}, площадь: ${(height * width / 1000000).toFixed(2)})` 
    gas && result.materials.push({
        name: gas,
        value: selfcost.materials[gas].value * S_calc * allPlaneThickness * 0.017, //0.017 - посчитал Дима
        count: S_calc * allPlaneThickness * 0.017,
        string: `${selfcost.materials[gas].value} * ${S_calc} * ${allPlaneThickness} * 0.017`,
        formula: 'Цена за м² * Площадь * Толщина всех рамок * 0.017'
    });
    const context = { selfcost, result, allThickness, planes, P, S: S_calc, spo: true, allPlaneThickness, data, type: 'Стеклопакет', sealant };
    allWorks['assemblePlane'] += planes.length
    allWorks['assembleGlasspacket'] += planes.length
    allWorks['sealing2'] += planes.length
    console.log(allWorks)
    for(const work of Object.keys(allWorks)){
        if(allWorks[work] > 0){
            const multiplier = (shape == false && work === 'assembleGlasspacket') ? 2 : 1
            constructWorks(work, allWorks[work], context, multiplier);
        }
    }
    constructMaterials(context)

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
    let sizeCoef = 1
    if(S_calc > 2)
        sizeCoef = 1.4
    if(S_calc > 4)
        sizeCoef = 1.5
    const gostPrice = 0
    const retailPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет Розница`].value * sizeCoef
    const bulkPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет Опт`].value * sizeCoef
    const dealerPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет Дилер`].value * sizeCoef
    const vipPrice = calcmaterialsandworks * selfcost.pricesAndCoefs[`Стеклопакет ВИП`].value * sizeCoef
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
        name: 'Себестоимость калькулятора для объектов',
        value: objectmaterialsandworks,
        string: `${(objectmaterialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы (Себестоимость стекла берется "Цена для коммерческих объектов")`
    },{
        name: 'Цена для Выше госта',
        value: gostPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Выше госта`]?.value}${sizeCoef > 1 ? ` * ${sizeCoef}` : ''}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Выше госта"`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Розница`].value}${sizeCoef > 1 ? ` * ${sizeCoef}` : ''}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Розница"`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Опт`].value}${sizeCoef > 1 ? ` * ${sizeCoef}` : ''}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Опт"`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет Дилер`].value}${sizeCoef > 1 ? ` * ${sizeCoef}` : ''}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "Дилер"`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${calcmaterialsandworks.toFixed(2)} * ${selfcost.pricesAndCoefs[`Стеклопакет ВИП`].value}${sizeCoef > 1 ? ` * ${sizeCoef}` : ''}`,
        formula: `Себестоимость калькулятора * Наценка для типа клиента "ВИП"`
    }]
    result.other = {
        materialsandworks,
        calcmaterialsandworks,
        S,
        allThickness,
        P,
        weight,
        productType: true,
        type: 'Стеклопакет',
        viz,
        materials,
        stanok,
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

function constructMaterials(context){
    const { selfcost, result, planes, P, allPlaneThickness, sealant} = context;
    result.materials.push({
        name: 'Первичный герметик (бутил)',
        value: selfcost.materials['Первичный герметик (бутил)'].value * P * 8 * planes.length / 1000,
        count: P * 8 * planes.length / 1000,
        string: `${selfcost.materials['Первичный герметик (бутил)'].value} * ${P.toFixed(2)} * 8 * ${planes.length.toFixed(2)} / 1000`,
        formula: 'Цена за первичный герметик (бутил) * Периметр * 8 * Количество дистанционных рамок / Перевод в кг'
    });
    sealant ? result.materials.push({
        name: sealant,
        value: selfcost.materials[sealant].value * (P * 8 * allPlaneThickness / 1000),
        count: P * 8 * allPlaneThickness / 1000,
        string: `${selfcost.materials[sealant].value} * (${P.toFixed(2)} * 8 * ${allPlaneThickness.toFixed(2)} / 1000)`,
        formula: 'Цена за вторичный герметик * (Периметр * 8 * Толщина всех рамок / Перевод в кг)'
    }) : result.materials.push({
        name: 'Вторичный герметик силикон (А+В)',
        value: selfcost.materials['Вторичный герметик силикон (А+В)'].value * (P * 8 * allPlaneThickness / 1000),
        count: P * 8 * allPlaneThickness / 1000,
        string: `${selfcost.materials['Вторичный герметик силикон (А+В)'].value} * (${P.toFixed(2)} * 8 * ${allPlaneThickness.toFixed(2)} / 1000)`,
        formula: 'Цена за вторичный герметик * (Периметр * 8 * Толщина всех рамок / Перевод в кг)'
    })
    // result.materials.push({
    //     name: 'Термоэтикетка',
    //     value: selfcost.materials['Термоэтикетка'].value * 2,
    //     string: `${selfcost.materials['Термоэтикетка'].value} * 2`,
    //     formula: 'Цена термоэтикетки 2шт'
    // });
}
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
export default Calculate