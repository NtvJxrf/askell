const Calculate = (data, selfcost) => {
    console.log(data)
    const { height, width, cutsv1, cutsv2, cutsv3, shape, print, material1, material2, customertype, rounding } = data
    const materials = [material1, material2]
    const works = { cutsv1, cutsv2 }
    const S = (height * width) / 1000000
    let weight = 0
    let name = `Керагласс, ${materials.join(' + ')}, (${height}х${width}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''})`

    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    let price = 12345
    result.other = {
        S,
        S_tape,
        trim,
        stanok,
        productType: true,
        type: 'Керагласс',
        viz: true
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