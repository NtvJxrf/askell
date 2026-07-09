const generateStages = (data, place) => {
    const result = []
    switch (place) {
        case 'glass': {
            const stanok = data.result.other.stanok
            const processing = data.initialData.processing
            if (!processing) throw new Error('Нет данных о виде обработки')
            result.push('Раскрой')
            stanok === 'Криволинейка' && processing === 'Шлифовка' && result.push('КР Шлифовка')
            stanok === 'Криволинейка' && processing === 'Полировка' && result.push('КР Полировка')
            stanok === 'Прямолинейка' && processing === 'Притупка' && result.push('ПР Притупка')
            stanok === 'Прямолинейка' && processing === 'Полировка' && result.push('ПР Полировка')
            stanok === 'Прямолинейка' && processing === 'Шлифовка' && result.push('ПР Шлифовка')
            data.initialData.drills && result.push('Сверление')
            data.initialData.drillssmd && result.push('Сверление')
            data.initialData.zenk && result.push('Зенковка')
            data.initialData.tempered && result.push('Закалка')
            result.push('ОТК')
            return result
        }
        case 'viz':
            data.initialData.color && result.push('Окраска стекла')
            data.initialData.color && result.push('Зачистка стекла')
            data.result.other.type === 'Триплекс' && result.push('Триплексование')
            data.initialData.print && result.push('УФ печать')
            data.initialData.color && result.push('Упаковка в картон')
            result.push('ОТК')
            return result
        case 'vizCera':
            result.push('Раскрой гидрорез Керамики')
            data.initialData.color && result.push('Окраска стекла')
            result.push('ОТК')
            return result
        case 'glassPolev':
            result.push('Раскрой')
            data[2] === 'Притупка' && result.push('ПР Притупка')
            data[2] === 'Полировка' && result.push('ПР Полировка')
            data[2] === 'Шлифовка' && result.push('ПР Шлифовка')
            data[1] && result.push('Закалка')
            result.push('ОТК')
            return result
        case 'SPbuild':
            result.push('Изготовление рамки')
            result.push('Сборка стеклопакета')
            result.push('Вторичная герметизация')
            return result
    }
}
export default generateStages
