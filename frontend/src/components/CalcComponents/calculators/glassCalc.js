const Calculate = (data, selfcost) => {
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, tempered, shape, print, tape1, tape2, customertype, rounding, trim } = data
    const works = { cutsv1, cutsv2 }
    const S = (height * width) / 1000000
    const thickness = Number(material.match(/\d+/)[0])
    let weight = S * 2.5 * thickness
    let name = `${material}(${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`

    const result = {
        materials: [],
        works: [],
        other: {}
    }
    let price = 12345
    result.other = {
        S,
        trim,
        productType: true,
        type: 'Стекло',
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