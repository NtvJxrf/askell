const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, cuts, smdType, color, rounds, drillssmd, print, notax, quantity = 1 } = data
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {},
        errors: [],
        warnings: []
    }
    const S = (height * width) / 1000000
    const P = ((height + width) * 2) / 1000
    const thickness = Number(material.match(/\d+/)[0])
    let weight = S * 2.5 * thickness
    let name = `Доска стеклянная магнитно-маркерная ASKELL ${smdType === 'Иное' ? 'Size' : smdType} (${width}х${height}), ${material}${color ? `, ${color}` : ''}${print ? `, УФ печать` : ''}${cuts ? `, Вырезы: ${cuts}` : ''}`
    const straightTypes = ['Lux', 'Standart', 'Krystal']
    const larger = Math.max(height, width)
    const stanok = (straightTypes.includes(smdType), larger > 2500 && cuts == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const culc = (clientType) => {
        let temp = 0
        if(S >= 1.2){
            result.materials.push({
                    name: `Цена для типа клиента ${clientType}`,
                    value: selfcost.pricesAndCoefs[`${clientType} S >= 1.2`].value * S,
                    string: `${(selfcost.pricesAndCoefs[`${clientType} S >= 1.2`].value).toFixed(2)} * ${S.toFixed(2)}`,
                    formula: `Цена для типа клиента ${clientType} при S >= 1.2 * S`
                });
                temp = selfcost.pricesAndCoefs[`${clientType} S >= 1.2`].value * S
        }else{
            result.materials.push({
                    name: 'Цена для типа клиента',
                    value: selfcost.pricesAndCoefs[`${clientType} S < 1.2`].value * S,
                    string: `${(selfcost.pricesAndCoefs[`${clientType} S < 1.2`].value).toFixed(2)} * ${S.toFixed(2)}`,
                    formula: `Цена для типа клиента ${clientType} при S < 1.2 * S`
                });
                temp = selfcost.pricesAndCoefs[`${clientType} S < 1.2`].value * S
        }
        const coef = temp * 0.2  // 20% коэфицент какой то

        smdType != 'Krystal' && print && (result.works.push({
                                            name: 'УФ печать',
                                            value: coef,
                                            string: `${(temp).toFixed(2)} * ${0.2}`,
                                            formula: `Если тип не Krystal и есть печать, то + 20% к цене`
                                        }))
        
        rounds > 0 && (result.works.push({
            name: 'Скругления',
            value: coef,
            string: `${temp} * ${0.2}`,
            formula: 'Если есть скругления, то + 20% к цене'
        }))
        cuts && result.works.push({
            name: 'Вырезы СМД',
            value: selfcost.pricesAndCoefs['Вырезы СМД'].value * cuts,
            string: `${selfcost.pricesAndCoefs['Вырезы СМД'].value} * ${cuts}`,
            formula: 'Себестоимость * Количество'
        })
        drillssmd && result.works.push({
            name: 'Сверление СМД',
            value: selfcost.pricesAndCoefs['Сверление СМД'].value * drillssmd,
            string: `${selfcost.pricesAndCoefs['Сверление СМД'].value} * ${drillssmd}`,
            formula: 'Себестоимость * Количество'
        })
        switch (material) {
            case 'Стекло Matelux, 4 мм':
                result.materials.push({
                    name: material,
                    value: coef,
                    string: `${(temp).toFixed(2)} * ${0.2}`,
                    formula: 'Если материал Matelux, то + 20% к цене'
                });
                break
            case 'Стекло осветленное OptiWhite, 4 мм':
                !notax && result.materials.push({
                    name: material,
                    value: selfcost.pricesAndCoefs[`Optiwhite SMD`].value * S,
                    string: `${(selfcost.pricesAndCoefs[`Optiwhite SMD`].value).toFixed(2)} * ${S.toFixed(2)}`,
                    formula: 'Цена за Optiwhite * Площадь'
                });
                break
        }

        let materialsandworks = 0
        for (const item of Object.values(result.materials)) {
            materialsandworks += item.value
        }
        for (const item of Object.values(result.works)) {
            materialsandworks += item.value
        }
        result.materials = []
        result.works = []
        return materialsandworks
    }
    const gostPrice = 0
    const retailPrice = culc('Розница')
    const bulkPrice = culc('Опт')
    const dealerPrice = culc('Дилер')
    const vipPrice = culc('ВИП')
    result.finalPrice = [{
        name: 'Цена для Выше госта',
        value: gostPrice,
        string: `${gostPrice}`,
        formula: `Цена для типа клиента "Выше госта"`
    },{
        name: 'Цена для Розница',
        value: retailPrice,
        string: `${retailPrice}`,
        formula: `Цена для типа клиента "Розница"`
    },{
        name: 'Цена для Опт',
        value: bulkPrice,
        string: `${bulkPrice}`,
        formula: `Цена для типа клиента "Опт"`
    },{
        name: 'Цена для Дилер',
        value: dealerPrice,
        string: `${dealerPrice}`,
        formula: `Цена для типа клиента "Дилер"`
    },{
        name: 'Цена для ВИП',
        value: vipPrice,
        string: `${vipPrice}`,
        formula: `Цена для типа клиента "ВИП"`
    }]
    result.other = {
        S,
        P,
        stanok,
        weight,
        productType: true,
        type: 'СМД',
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