const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding, trim } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value);
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    const works = { polishing, drills, zenk, cutsv1, cutsv2 }
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}, ${polishing ? 'Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    const S = (height * width) / 1000000
    const P = 2 * (height + width) / 1000
    let allThickness = 0
    let weight = 0
    const larger = Math.max(height, width)
    const lesser = Math.min(height, width)
    const result = {
        materials: [],
        works: [],
        other: {}
    }
    //Если выбрали 'Пленка EVA Прозрачная 0,38мм', то их считать 2 шт
    //Если выбрали 'Пленка EVA Прозрачная 0,76мм', то считать ее одну
    //Если цветная пленка (Все остальные кроме смарт и хамелеон), то считать выбранную + 'Пленка EVA Прозрачная 0,38мм'
    //Если смарт, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,76мм'
    //Если хамелеон, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,38мм'
    //Себестоимость пленки будет S_tape * себестоимость пленок * кол-во
    let S_tape = null
    if(larger <= 2100) S_tape = (2100 * lesser) / 1000000
    else S_tape = (2100 * larger) / 1000000    // Считаем площадь используемой пленки | 2100 это ширина рулона
    for (const tape of tapes) {
        const mats = result.materials
        switch (tape) {
            case undefined:
                mats.push({name: `Пленка EVA Прозрачная 0,38мм`, value: selfcost.materials[`Пленка EVA Прозрачная 0,38мм`].salePrices[0].value * S_tape * 2, count: S_tape * 2})
            break;
            case 'Смарт пленка Magic Glass':
                mats.push({name: tape, value: selfcost.materials[tape].salePrices[0].value * S_tape, count: S_tape})
                mats.push({name: 'Пленка EVA Прозрачная 0,76мм', value: selfcost.materials['Пленка EVA Прозрачная 0,76мм'].salePrices[0].value * S_tape * 2, count: S_tape * 2})
            break;
            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                mats.push({name: tape, value: selfcost.materials[tape].salePrices[0].value * S_tape, count: S_tape})
                mats.push({name: 'Пленка EVA Прозрачная 0,38мм', value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value * S_tape * 2, count: S_tape * 2})
            break;
            default:
                mats.push({name: tape, value: selfcost.materials[tape].salePrices[0].value * S_tape, count: S_tape})
                mats.push({name: 'Пленка EVA Прозрачная 0,38мм', value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value * S_tape, count: S_tape})
            break;
        }
    }
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        allThickness += thickness
        weight += 2.5 * S * thickness
        tempered && result.works.push({name: `Закалка ${thickness}`, value: selfcost.works[`Закалка ${thickness}`], string: ``})
        result.materials.push({name: `${material}`, value: selfcost.materials[material].salePrices[0].value * S * trim})
    }
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    result.works.push({name: 'Шлифовка', value: selfcost.works[`${stanok} Шлифовка`] * P, string: ``})
    result.works.push({name: 'Триплексование', value: selfcost.works[`Триплекс ${allThickness} мм`], string: ``})
    for(const work in works){
        if(work === 0) continue
        switch(work){
            case 'polishing':
                works[work] && result.works.push({name: 'Полировка', value: selfcost.works[`${stanok} Полировка`] * P, string: `${selfcost.works[`${stanok} Полировка`]} * ${P.toFixed(2)}`})
            break
            case 'drills':
                result.works.push({name: 'Сверление', value: selfcost.works['Сверление стекла, керамики'] * materials.length * works[work] })
            break
            case 'zenk':
                result.works.push({name: 'Зенковка', value: selfcost.works['Зенковка'] * materials.length * works[work]})
            break
            case 'cutsv1':
                result.works.push({name: 'Вырез в стекле 1 кат', value: selfcost.works['Вырез в стекле 1 кат'] * materials.length * works[work]})
            break
            case 'cutsv2':
                result.works.push({name: 'Вырез в стекле 2 кат', value: selfcost.works['Вырез в стекле 2 кат'] * materials.length * works[work] })
            break
            case 'cutsv3':
                result.works.push({name: 'Вырез в стекле 3 кат', value: selfcost.works['Вырез в стекле 3 кат'] * materials.length * works[work] })
            break
        }
    }
    if(tempered){
        //result.works.push({name: 'Закалка', cost: selfcost.works['Зенковка'], count: materials.height })
    }
    let materialsandworks = 0
    for (const item of Object.values(result.materials)) {
        materialsandworks += item.value
    }
    for (const item of Object.values(result.works)) {
        materialsandworks += item.value
    }
    const workshopExpenses = materialsandworks * 0.48   // % цеховых расходов
    const commercialExpenses = (materialsandworks + workshopExpenses) * 0.064 // % коммерческих расходов
    const householdExpenses =  (materialsandworks + workshopExpenses) * 0.2525 //общехозяйственные расходы
    const price = workshopExpenses + commercialExpenses + householdExpenses + materialsandworks
    result.other = {
        S,
        S_tape,
        trim,
        stanok,
        allThickness,
        commercialExpenses,
        householdExpenses,
        workshopExpenses,
        materialsandworks,
        weight,
        type: 'Триплекс',
        productType: true,
        viz: true
    }
    console.log(result)
    return {
            key: Date.now(),
            name,
            price,
            added: false,
            quantity: 1,
            initialData: data,
            selfcost,
            result
    }
}
export default Calculate