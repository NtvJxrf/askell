const generateProductAttributes = (data, attributes, sklad_materials) => {
    const result = []
    data?.order?.name && result.push({ meta: attributes.product["№ заказа покупателя"].meta, value: data.order.name })
    for(const attribute in data){
        switch(attribute) {
            case 'height': data.height && result.push({ meta: attributes.product["Длина в мм"].meta, value: data.height }); break;
            case 'width': data.width && result.push({ meta: attributes.product["Ширина в мм"].meta, value: data.width }); break;
            case 'cutsv1': data.cutsv1 && result.push({ meta: attributes.product["Кол-во вырезов 1 категорий"].meta, value: data.cutsv1 }); break;
            case 'cutsv2': data.cutsv2 && result.push({ meta: attributes.product["Кол-во вырезов 2 категорий"].meta, value: data.cutsv2 }); break;
            case 'cutsv3': data.cutsv3 && result.push({ meta: attributes.product["Кол-во вырезов 3 категорий"].meta, value: data.cutsv3 }); break;
            case 'drills': data.drills && result.push({ meta: attributes.product["Кол-во сверлений"].meta, value: data.drills }); break;
            case 'zenk': data.zenk && result.push({ meta: attributes.product["Кол-во зенкований"].meta, value: data.zenk }); break;
            case 'material': data.material && result.push({ meta: attributes.product["Материал 1"].meta, value: data.material || '' }); break;
            case 'materials': data.materials?.length && result.push({ meta: attributes.product["Кол-во полуфабрикатов"].meta, value: data.materials.length }); break;
            case 'material1': data.material1 && result.push({ meta: attributes.product["Материал 1"].meta, value: data.material1 }); break;
            case 'material2': data.material2 && result.push({ meta: attributes.product["Материал 2"].meta, value: data.material2 }); break;
            case 'material3': data.material3 && result.push({ meta: attributes.product["Материал 3"].meta, value: data.material3 }); break;
            case 'material4': data.material4 && result.push({ meta: attributes.product["Материал 4"].meta, value: data.material4 }); break;
            case 'tape1': data.tape1 && result.push({ meta: attributes.product["Пленка 1"].meta, value: {meta: sklad_materials[data.tape1].meta} }); break;
            case 'tape2': data.tape2 && result.push({ meta: attributes.product["Пленка 2"].meta, value: {meta: sklad_materials[data.tape2].meta} }); break;
            case 'tape3': data.tape3 && result.push({ meta: attributes.product["Пленка 3"].meta, value: {meta: sklad_materials[data.tape3].meta} }); break;
            case 'color': data.color && result.push({ meta: attributes.product["Окрашивание"].meta, value: data.color || '' }); break;
            case 'print': data.print === true && result.push({ meta: attributes.product["Печать"].meta, value: true }); break;
            case 'processing': data.processing && result.push({ meta: attributes.product["Вид обработки"].meta, value: data.processing }); break;
            case 'type': data.type && result.push({ meta: attributes.product["Тип изделия"].meta, value: data.type }); break;
            case 'stanok': data.stanok && result.push({ meta: attributes.product["Тип станка"].meta, value: data.stanok }); break;
            case 'tempered': data.tempered === true && result.push({ meta: attributes.product["Закалка"].meta, value: true }); break;
            case 'isPF': data.isPF === true && result.push({ meta: attributes.product["Это полуфабрикат"].meta, value: true }); break;
            case 'belongsTo': data.belongsTo && result.push({ meta: attributes.product["Принадлежит позиции"].meta, value: data.belongsTo }); break;
            case 'P': data.P && result.push({ meta: attributes.product["Периметр 1 детали в пог. м"].meta, value: data.P }); break;
            case 'details': result.push({ meta: attributes.product["Детали"].meta, value: JSON.stringify(data.details) }); break;
            case 'resultTapes': result.push({ meta: attributes.product["Пленки"].meta, value: data?.resultTapes?.join(' | ') || '' }); break;
        }
    }
    return result.filter(el => el.value != undefined)
}
export default generateProductAttributes