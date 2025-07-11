const Calculate = (data, selfcost) => {
    const { height, width, gas, material1, material2, material3, tempered1, tempered2, tempered3, plane1, plane2, customertype, rounding } = data
    const materials = [[material1, tempered1], [material2, tempered2], [material3, tempered3]]
    const planes = [plane1, plane2]

    const S = (height * width) / 1000000
    const P = 2 * (height + width) / 1000
    let weight = 0
    let name = `Стеклопакетик`
    let allThickness = 0
    let allPlaneThickness = 0
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    for(const material of materials){
        if(!material[0]) continue
        const thickness = Number(material[0].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        allThickness += thickness
        weight += 2.5 * S * thickness
        //ДОБАВИТЬ ЗАКАЛКУ < ==============================================
        result.materials.push({
            name: material[0],
            value: selfcost.materials[material[0]].value * S * selfcost.pricesAndCoefs['Коэффициент обрези стекло'],
            string: `${selfcost.materials[material[0]].value} * ${S.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези стекло']}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези стекло'
        });
    }

    for(const plane of planes){
        // const thickness = Number(plane.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1]) // Добавить толщина рамки
        // allThickness += thickness

        result.materials.push({
            name: plane,
            value: selfcost.materials[plane].value * P * selfcost.pricesAndCoefs['Коэффициент обрези рамка'],
            string: `${selfcost.materials[plane].value} * ${P.toFixed(2)} * ${selfcost.pricesAndCoefs['Коэффициент обрези рамка']}`,
            formula: 'Цена за м² * Периметр * Коэффициент обрези рамка'
        });
    }
    gas && result.materials.push({
            name: gas,
            value: selfcost.materials[gas].value * S * allPlaneThickness,
            string: `${selfcost.materials[gas].value} * ${S} * ${allPlaneThickness}`,
            formula: 'Цена за м² * Площадь * Толщина всех рамок'
        });
    const context = { selfcost, result, planes, materials, P, S, allThickness };
    constructMaterials(context)
    let price = 12345
    result.other = {
        S,
        S_tape,
        trim,
        stanok,
        productType: true,
        type: 'Стеклопакет',
        viz: false
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

function constructMaterials(){
    const { selfcost, result, planes, materials, P, S, allThickness} = context;
    result.materials.push({
        name: 'Монтажный уголок',
        value: selfcost.materials['Монтажный уголок'].value * planes.length,
        string: `${selfcost.materials['Монтажный уголок'].value} * ${planes.length.toFixed(2)}`,
        formula: 'Цена за монтажный уголок * Количество дистанционных рамок'
    });
    result.materials.push({
        name: 'Бутил первичный',
        value: selfcost.materials['Бутил первичный'].value * P * 8 * planes.length,
        string: `${selfcost.materials['Бутил первичный'].value} * ${P.toFixed(2)} * 8 * ${planes.length.toFixed(2)}`,
        formula: 'Цена за бутил первичный * Периметр * 8 * Количество дистанционных рамок'
    });
    result.materials.push({
        name: 'Бутил вторичный',
        value: selfcost.materials['Бутил вторичный'].value * (P * 12 / 1000 * allThickness),
        string: `${selfcost.materials['Бутил вторичный'].value} * (${P.toFixed(2)} * 12 / 1000 * ${allThickness.toFixed(2)})`,
        formula: 'Цена за бутил вторичный * (Периметр * 12 / 1000 * Толщина стеклопакета)'
    });
    result.materials.push({
        name: 'Влагопоглатитель (сито)',
        value: selfcost.materials['Влагопоглатитель (сито)'].value * S * 15 * allThickness,
        string: `${selfcost.materials['Влагопоглатитель (сито)'].value} * S * 15 *${allThickness.toFixed(2)}`,
        formula: 'Цена за влагопоглатитель (сито) * Площадь * 15 * Толщина всех рамок'
    });
    result.materials.push({
        name: 'Термоэтикетка',
        value: selfcost.materials['Термоэтикетка'].value,
        string: `${selfcost.materials['Термоэтикетка'].value}`,
        formula: 'Цена термоэтикетки'
    });
}
export default Calculate