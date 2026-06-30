import checkDetail from './checkDetails.js'
import constructName from './constructName.js'
import constructWorks from './constructWorks.js'

const Calculate = (data, selfcost) => {
    const { height, width, quantity = 1, thickness, ignoreRestricts = false, rounding} = data
    if(![4, 5, 6, 8, 10, 12].includes(thickness)) throw new Error('Нет цены на закалку стекла такой толщины')
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
    ignoreRestricts || checkDetail({width, height, tempered: true, thickness, clientTempering: true, material: 'Стекло' })
    const temperingSelfcost = selfcost.pricesAndCoefs[`Закалка давальческого стекла ${thickness} мм`].value
    const temperingPrice = temperingSelfcost * S_calc
    result.other = {
        calcMaterialAndWorks: temperingSelfcost * S_calc,
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
        value: temperingSelfcost * S_calc,
        finalValue: temperingSelfcost * S_calc,
        string: `${temperingSelfcost} * ${S_calc.toFixed(2)}`,
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