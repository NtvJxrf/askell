import { constructWorks, constructName, checkDetail } from './triplexCalc'

const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, quantity = 1, thickness} = data
    if(![4, 5, 6, 8, 10, 12].includes(thickness)) throw new Error('Нет цены на закалку стекла такой толщины')
    let S = (height * width) / 1000000
    const P = ((height + width) * 2) / 1000
    let weight = (height * width) / 1000000 * 2.5 * thickness
    const result = {
        materials: [],
        calcMaterials: [],
        works: [],
        expenses: [],
        errors: [],
        warnings: []
    }
    checkDetail({width, height, tempered: true, result, thickness, material: 'Стекло'})
    const temperingSelfcost = selfcost.pricesAndCoefs[`Закалка давальческого стекла ${thickness} мм`].value
    const temperingPrice = temperingSelfcost * S
    result.other = {    
        customerSuppliedGlassForTempering: true,
        S,
        weight,
        type: 'Закалка стекла',
        productType: true,
        viz: false,
    }
    result.finalPrice = [{
        name: 'Настоящая себестоимость',
        value: temperingPrice,
        string: `${temperingPrice.toFixed(2)}`,
        formula: `Себестоимость закалки давальческого стекла`
    },{
        name: 'Цена для Розница',
        value: temperingPrice,
        string: `${temperingPrice}`,
        formula: `Себестоимость закалки давальческого стекла`
    }]
    result.works.push({
        name: 'Закалка давальческого стекла',
        value: temperingSelfcost * S,
        finalValue: temperingSelfcost * S,
        string: `${temperingSelfcost} * ${S.toFixed(2)}`,
        formula: 'Себестоимость закалки * S'
    })
    return {
        key: crypto.randomUUID(),
        name: `Закалка давальческого стекла ${thickness} мм (${width}х${height})`,
        prices: {
            gostPrice: temperingPrice,
            retailPrice: temperingPrice,
            bulkPrice: temperingPrice,
            dealerPrice: temperingPrice,
            vipPrice: temperingPrice
        },
        added: false,
        quantity,
        initialData: data,
        type: 'Закалка стекла',
        result
    }
}

export default Calculate