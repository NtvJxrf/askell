const Calculate = (data, selfcost) => {
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, print, customertype, rounding, trim } = data
    const works = { tempered, polishing, drills, zenk, cutsv1, cutsv2, cutsv3 }
    const S = (height * width) / 1000000
    const P = ((height + width) * 2) / 1000
    const thickness = Number(material.match(/\d+/)[0])
    let weight = S * 2.5 * thickness
    let name = `${material}(${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const result = {
        materials: [],
        works: [],
        other: {}
    }
    result.materials.push({name: material, value: selfcost.materials[material].salePrices[0].value * S})
    result.works.push({name: 'Шлифовка', value: selfcost.workPrices['Шлифовка'][stanok] * P})
    for(const work in works){
        if(!work) continue
        switch(work){
            case 'polishing':
                result.works.push({name: 'Полировка', value: selfcost.workPrices['Полировка'][stanok] * P, string: `${selfcost.workPrices['Полировка'][stanok].toFixed(2)} * ${P.toFixed(2)}`})
            break
            case 'drills':
                result.works.push({name: 'Сверление', value: selfcost.workPrices['Сверление'] * works[work] })
            break
            case 'zenk':
                result.works.push({name: 'Зенковка', value: selfcost.workPrices['Зенковка'] * works[work]})
            break
            case 'cutsv1':
                result.works.push({name: 'Вырез в стекле 1 кат', value: selfcost.workPrices['Вырез в стекле 1 кат'] * works[work]})
            break
            case 'cutsv2':
                result.works.push({name: 'Вырез в стекле 2 кат', value: selfcost.workPrices['Вырез в стекле 2 кат'] * works[work] })
            break
            // case 'cutsv3':
            //     result.works.push({name: 'Вырез в стекле 3 кат', cost: selfcost.workPrices['Вырез в стекле 3 кат'], count: works[work] })
            // break
        }
    }

    let price = 0
    result.other = {
        S,
        P,
        trim,
        stanok,
        productType: true,
        type: 'Стекло',
    }
    console.log(result)
    return {
        key: Date.now(),
        name,
        price,
        added: false,
        quantity: 1,
        details: { initialData: data, selfcost },
        result
    }
}

export default Calculate






//площадь *( себес Стекло (зеркало) )* коэф.обрези+ стоимость Полуфабрикат краски выбранной (себес)*2 *0,3*площадь+ площадь*(стоимость краски печатной*0,048+RAL 9003 (Белый)себес *0,3)
// 0.3 = это норматив краски на 1м2
// уф печать делается на стороне, как ее включить в расчеты?

