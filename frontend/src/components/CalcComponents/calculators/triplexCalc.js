const Calculate = (data, selfcost) => {
    console.log(data)
    const { length, width, processing, drills, zenk, cutsv1, cutsv2, tempered, shape, print, material1, material2, material3, tape1, tape2, customertype, rounding, trim } = data
    const tapes = [tape1, tape2]
    const materials = [material1, material2, material3].filter(material => material !== undefined);
    const works = { processing, drills, zenk, cutsv1, cutsv2 }
    let name = `Триплекс, ${materials.join(' + ')}, (${length}х${width}, ${processing}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    const S = (length * width) / 1000000
    const P = 2 * (length + width)
    
    let weight = 0
    const larger = Math.max(length, width)
    const lesser = Math.min(length, width)
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
        if(!tape) continue 
        const mats = result.materials
        switch (tape) {
            case 'Пленка EVA Прозрачная 0,38мм':
                mats.push({name: tape, cost: selfcost.materials[tape].salePrices[0].value, count: S_tape * 2})
                break;
            case 'Пленка EVA Прозрачная 0,76мм':
                mats.push({name: tape, cost: selfcost.materials[tape].salePrices[0].value, count: S_tape})
                break;
            case 'Смарт пленка Magic Glass':
                mats.push({name: tape, cost: selfcost.materials[tape], count: S_tape})
                mats.push({name: 'Пленка EVA Прозрачная 0,76мм', cost: selfcost.materials['Пленка EVA Прозрачная 0,76мм'].salePrices[0].value, count: S_tape * 2})
                break;
            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                mats.push({name: tape, cost: selfcost.materials[tape], count: S_tape})
                mats.push({name: 'Пленка EVA Прозрачная 0,38мм', cost: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value, count: S_tape * 2})
                break;
            default:
                mats.push({name: tape, cost: selfcost.materials[tape], count: S_tape})
                mats.push({name: 'Пленка EVA Прозрачная 0,38мм', cost: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value, count: S_tape})
        }
    }
    for(const material of materials){
        if(!material) continue
        weight += 2.5 * S * material.t
        result.materials.push({name: `${material}`, cost: selfcost.materials[material].salePrices[0].value, count: S * trim})
    }
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    for(const work in works){
        if(work === 0) continue
        switch(work){
            case 'processing':
                   result.works.push({name: works[work], cost: selfcost.workPrices[works[work]][stanok], count: S * trim})
            break
            case 'drills':
                   result.works.push({name: 'Сверление', cost: selfcost.workPrices['Сверление'], count: materials.length * works[work] })
            break
            case 'zenk':
                   result.works.push({name: 'Зенковка', cost: selfcost.workPrices['Зенковка'], count: materials.length * works[work]})
            break
            case 'cutsv1':
                   result.works.push({name: 'Вырез в стекле 1 кат', cost: selfcost.workPrices['Вырез в стекле 1 кат'], count: materials.length * works[work]})
            break
            case 'cutsv2':
                   result.works.push({name: 'Вырез в стекле 2 кат', cost: selfcost.workPrices['Вырез в стекле 2 кат'], count: materials.length * works[work] })
            break
        }
    }
    if(tempered){
        //result.works.push({name: 'Закалка', cost: selfcost.workPrices['Зенковка'], count: materials.length })
    }
    let price = 0
    console.log(result)
    for (const item of Object.values(result.materials)) {
        price += item.cost * item.count;
    }
    for (const item of Object.values(result.works)) {
        price += item.cost * item.count;
    }
    result.other = {
        S,
        S_tape,
        trim,
        stanok,
        type: 'Триплекс',
    }
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