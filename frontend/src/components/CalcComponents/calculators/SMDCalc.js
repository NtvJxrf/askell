const Calculate = (data, selfcost) => {
    console.log(data)
    const { material, height, width, cuts, type, rounds, color, customertype, print, rounding, trim } = data
    
    const S = (height * width) / 1000000
    const thickness = Number(material.match(/\d+/)[0])
    let weight = S * 2.5 * thickness
    let name = `СМД, ${material}(${height}х${width})`

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
        type: 'СМД'
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