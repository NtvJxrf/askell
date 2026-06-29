export default function constructName(firstWord, data) {
    const {
        height,
        width,
        stanok,
        tempered = false,
        cutsv1 = 0,
        cutsv2 = 0,
        cutsv3 = 0,
        drills = 0,
        zenk = 0,
        print = false,
        color = false,
        blank,
        processing
    } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value).map( el => {
        if(el === '-')
            return undefined
        else return el
    }).filter(Boolean)
    const parts = [];
    if(stanok) stanok == 'Прямолинейка' ? parts.push('ПР') : parts.push('КР')
    switch(processing){
        case 'Притупка': parts.push('Притупка'); break;
        case 'Шлифовка': parts.push('Шлифовка'); break;
        case 'Полировка': parts.push('Полировка'); break;
    }
    if (tempered) parts.push('Закаленное');
    if (cutsv1) parts.push(`Вырезы 1 кат.: ${cutsv1}`);
    if (cutsv2) parts.push(`Вырезы 2 кат.: ${cutsv2}`);
    if (cutsv3) parts.push(`Вырезы 3 кат.: ${cutsv3}`);
    if (drills) parts.push(`Сверление: ${drills}`);
    if (zenk) parts.push(`Зенкование: ${zenk}`);
    if (print) parts.push('УФ Печать');
    if (color) parts.push(`Окрашивание: ${color}`);
    if (blank) parts.push(`Пятаки: ${blank}`);
    if (tapes.length > 0) parts.push(`Пленка: ${tapes.join(';').replaceAll('Пленка', '')}`);
    const area = ((height * width) / 1_000_000).toFixed(2);
    if(!firstWord.toLowerCase().includes('керагласс')) parts.push(`площадь: ${area}`)
    return `${firstWord}, (${width}х${height}${parts.length > 0 ? ', ' : ''}${parts.join(', ')})`;
};