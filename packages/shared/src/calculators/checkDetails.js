export default function checkDetail(data) {
    const {height, width, tempered, processing, material, stanok, type, selfcost, clientTempering} = data
    const largest = Math.max(height, width);
    const lowest = Math.min(height, width);
    const S = (height * width) / 1000000
    if(tempered) {
        if(largest > 6000 || lowest > 2800)
            throw new Error(`Размер стекла превышает допустимые значения для закалки. Максимум: 6000x2800, получено: ${width}x${height}`);
        if(largest < 500 || lowest < 200)
            throw new Error(`Размер стекла для закалки слишком мал. Минимальные допустимые размеры: 500x200 мм, получено: ${width}x${height}`);
        if (material.toLowerCase().includes('зеркало'))
            throw new Error('Зеркало не может быть закаленным')
    }
    if(clientTempering) return

    const materialData = selfcost.materials[material]
    const largestMaterial = Math.max(materialData?.w, materialData?.l)
    const lowestMaterial = Math.min(materialData?.w, materialData?.l)

    if(largest > largestMaterial || lowest > lowestMaterial)
        throw new Error(`Размеры детали больше чем размеры листа(${largestMaterial}х${lowestMaterial}), получено: ${largest}х${lowest}`)

    if (type == 'Триплекс'){
        if (largest > 3900 || lowest > 1900)
            throw new Error(`Размер стекла превышает допустимые значения для триплекса. Максимум: 3900x1900, получено: ${width}x${height}`);
    }
    if(stanok == 'Прямолинейка' && processing){
        if (processing === 'Притупка'){
            if (largest < 550 || lowest < 350)
                throw new Error(`Размер стекла слишком мал для прямолинейки. Минимальные допустимые размеры: 550x350 мм, получено: ${width}x${height}`);
            if (largest > 6000 || lowest > 3000)
                throw new Error(`Размер стекла превышает допустимые значения для операции "Притупка". Максимум: 6000x3000, получено: ${width}x${height}`);
        }
        if (processing === 'Полировка' || processing === 'Шлифовка'){
            if (largest < 200 || lowest < 150)
                throw new Error(`Размер стекла слишком мал для прямолинейки. Минимальные допустимые размеры: 150x200 мм, получено: ${width}x${height}`);
            if (largest > 3700 || lowest > 3700)
                throw new Error(`Размер стекла превышает допустимые значения для операции "${processing}". Максимум: 3700x3700, получено: ${width}x${height}`);
        }      
    }
    if (stanok == 'Криволинейка' && processing) {
        const validStandard = lowest >= 250;
        const validNarrow = lowest >= 100 && largest >= 500;
        if (!validStandard && !validNarrow) 
            throw new Error(`Размер стекла слишком мал для криволинейки.Минимальные допустимые размеры: 250×250мм или 100×500мм. Получено: ${width}×${height}`);
        
        const machines = [
            // { name: "Alpa", maxWidth: 3200, maxHeight: 2200 },
            { name: "Intermac", maxWidth: 3600, maxHeight: 1800 }
        ]
        const suitableMachines = machines.filter(machine => largest <= machine.maxWidth && lowest <= machine.maxHeight);
        if (suitableMachines.length === 0) 
            throw new Error('Стекло не подходит по максимальным размерам ни к одному станку на криволинейке');
        if(processing === 'Притупка')
            throw new Error('На криволинейке недоступна притупка')
    }
    if(type == 'Стеклопакет'){
        if(largest > 4500 || lowest > 2800)
            throw new Error(`Размер стекла превышает допустимые значения для стеклопакета. Максимум: 4500x2800, получено: ${width}x${height}`);
        if(largest < 350 || lowest < 250)
            throw new Error(`Размер стекла слишком мал для стеклопакета. Минимальные допустимые размеры: 350x250 мм, получено: ${width}x${height}`);
    }
}