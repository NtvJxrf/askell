const generateProductionTaskAttributes = (order, checkboxes, attributes) => {
    const result = []
    const { viz, smd, print, triplex, colors, ceraglass, height, width, material, glasspacket, pack } = checkboxes
    const ta = attributes.productiontask

    result.push({ meta: ta["№ заказа покупателя"].meta, value: order.name })
    Array.isArray(order.invoicesOut) && order.invoicesOut.length > 0 &&
        result.push({ meta: ta["№ Счета"].meta, value: order.invoicesOut.map(el => el.name).join(';') })
    order.agent && result.push({ meta: ta["Получатель"].meta, value: { meta: order.agent.meta } })
    viz && result.push({ meta: ta["Задание для ВИЗа"].meta, value: true })
    smd && result.push({ meta: ta["СМД"].meta, value: true })
    print && result.push({ meta: ta["Есть УФ печать"].meta, value: true })
    triplex && result.push({ meta: ta["Триплекс"].meta, value: true })
    ceraglass && result.push({ meta: ta["Керагласс"].meta, value: true })
    height && result.push({ meta: ta["Высота"].meta, value: Number(height) })
    width && result.push({ meta: ta["Ширина"].meta, value: Number(width) })
    material && result.push({ meta: ta["Материал"].meta, value: material })
    glasspacket && result.push({ meta: ta["Стеклопакет"].meta, value: true })
    pack && result.push({ meta: ta["Каркас"].meta, value: true })
    if (colors?.length > 0) {
        !smd && result.push({ meta: ta["Окрашивание"].meta, value: true })
        result.push({ meta: ta["Цвет"].meta, value: [...new Set(colors)].join(';') })
    }
    return result
}
export default generateProductionTaskAttributes
