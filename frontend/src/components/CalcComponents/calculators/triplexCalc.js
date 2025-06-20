const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value);
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    const works = { polishing, drills, zenk, cutsv1, cutsv2, print }
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    let S = (height * width) / 1000000
    if(S < 0.5){
        switch (rounding){
            case 'Округление до 0.5':
                S = 0.5
            break
            case 'Умножить на 2':
                S = S * 2
            break
        }
    }
    const P = 2 * (height + width) / 1000
    let allThickness = 0
    let weight = 0
    const larger = Math.max(height, width)
    const lesser = Math.min(height, width)
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    //Если цветная пленка (Все остальные кроме смарт и хамелеон), то считать выбранную + 'Пленка EVA Прозрачная 0,38мм'
    //Если смарт, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,76мм'
    //Если хамелеон, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,38мм'
    //Себестоимость пленки будет S_tape * себестоимость пленок * кол-во
    let S_tape = null
    if(larger <= 2100) S_tape = (2100 * lesser) / 1000000
    else S_tape = (2100 * larger) / 1000000    // Считаем площадь используемой пленки | 2100 это ширина рулона
    console.log(tapes)
    for (const tape of tapes) {
        switch (tape) {
            case undefined:
                    let useThinMaterial = false
                    for(const material of materials){
                        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
                        if(thickness < 4) useThinMaterial = true
                    }
                    if(useThinMaterial || lesser < 1050){
                        result.materials.push({
                            name: 'Пленка EVA Прозрачная 0,38мм',
                            value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value * S_tape,
                            count: S_tape,
                            string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                            formula: 'Цена за м² * Площадь плёнки'
                        });
                        break
                    }
                    result.materials.push({
                        name: 'Пленка EVA Прозрачная 0,76мм',
                        value: selfcost.materials['Пленка EVA Прозрачная 0,76мм'].salePrices[0].value * S_tape,
                        count: S_tape,
                        string: `${selfcost.materials['Пленка EVA Прозрачная 0,76мм'].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                        formula: 'Цена за м² * Площадь плёнки'
                    });
                break;

            case 'Смарт пленка Magic Glass':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].salePrices[0].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,76мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,76мм'].salePrices[0].value * S_tape * 2,
                    count: S_tape * 2,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,76мм'].salePrices[0].value / 100} * ${S_tape.toFixed(2)} * 2`,
                    formula: 'Цена за м² * Площадь плёнки * 2 слоя'
                });
                break;

            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].salePrices[0].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,38мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value * S_tape * 2,
                    count: S_tape * 2,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value / 100} * ${S_tape.toFixed(2)} * 2`,
                    formula: 'Цена за м² * Площадь плёнки * 2 слоя'
                });
                break;
            
            case 'Пленка EVA Прозрачная 0,38мм':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].salePrices[0].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                break;

            case 'Пленка EVA Прозрачная 0,76мм':
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].salePrices[0].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                break;

            default:
                result.materials.push({
                    name: tape,
                    value: selfcost.materials[tape].salePrices[0].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials[tape].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,38мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value * S_tape,
                    count: S_tape,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value / 100} * ${S_tape.toFixed(2)}`,
                    formula: 'Цена за м² * Площадь плёнки'
                });
                break;
        }

    }
    for(const material of materials){
        const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        allThickness += thickness
        weight += 2.5 * S * thickness
        
        tempered && result.works.push({
                name: `Закалка ${thickness} мм`,
                value: selfcost.pricesAndCoefs[`Закалка ${thickness}`] * S,
                string: `${selfcost.pricesAndCoefs[`Закалка ${thickness}`] / 100}мм * ${S}`,
                formula: `Себестоимость закалки * площадь`
            });
        result.materials.push({
            name: material,
            value: selfcost.materials[material].salePrices[0].value * S,
            string: `${selfcost.materials[material].salePrices[0].value / 100} * ${S.toFixed(2)}`,
            formula: 'Цена за м² * Площадь'
        });
    }
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const context = { works, selfcost, result, materials, P, stanok, S, allThickness };
    constructWorks('cutting', context);
    constructWorks('washing', context);
    constructWorks('grinding', context);
    constructWorks('triplexing', context);
    for (const work in works) {
        if (!work) continue;
        constructWorks(work, context);
    }

    let materialsandworks = 0
    for (const item of Object.values(result.materials)) {
        materialsandworks += item.value
    }
    for (const item of Object.values(result.works)) {
        materialsandworks += item.value
    }
    const workshopExpenses = materialsandworks * 0.48   // % цеховых расходов
    const commercialExpenses = (materialsandworks + workshopExpenses) * 0.064 // % коммерческих расходов
    const householdExpenses =  (materialsandworks + workshopExpenses) * 0.2525 //общехозяйственные расходы

    result.expenses.push({
        name: 'Цеховые расходы',
        value: workshopExpenses,
        string: `${(materialsandworks / 100).toFixed(2)} * 0.48`,
        formula: 'Материалы + работы * 48%'
    });

    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * 0.064`,
        formula: '(Материалы + Работы + Цеховые) * 6.4%'
    });

    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * 0.2525`,
        formula: '(Материалы + Работы + Цеховые) * 25.25%'
    });
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Триплекс ${customertype}`]
    result.finalPrice = {
        name: 'Итоговая цена',
        string: `(${(materialsandworks / 100).toFixed(2)} + ${((commercialExpenses + householdExpenses + workshopExpenses) / 100).toFixed(2)}) * ${selfcost.pricesAndCoefs[`Триплекс ${customertype}`]}`,
        formula: `(Материалы + Работы + Расходы) * Наценка для типа клиента ${customertype}`,
        value: price
    }
    result.other = {
        S,
        S_tape,
        P,
        stanok,
        allThickness,
        weight,
        type: 'Триплекс',
        productType: true,
        viz: true
    }
    console.log(result)
    return {
            key: Date.now(),
            name,
            price,
            added: false,
            quantity: 1,
            initialData: data,
            result
    }
}


export const constructWorks = (work, context) => {
    const { works, selfcost, result, materials, P, stanok, thickness, S, allThickness } = context;
    switch (work) {
        case 'polishing':
            if (works[work]) {
                result.works.push({
                    name: 'Полировка',
                    value: selfcost.pricesAndCoefs[`${stanok} Полировка`] * P,
                    string: `${selfcost.pricesAndCoefs[`${stanok} Полировка`] / 100} * ${P.toFixed(2)}`,
                    formula: 'Себестоимость работы * Периметр'
                });
            }
            break;

        case 'drills':
            result.works.push({
                name: 'Сверление',
                value: selfcost.pricesAndCoefs['Сверление стекла, керамики'] * materials.length * works[work],
                string: `${selfcost.pricesAndCoefs['Сверление стекла, керамики'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость работы * Кол-во материалов * Кол-во отверстий'
            });
            break;

        case 'zenk':
            result.works.push({
                name: 'Зенковка',
                value: selfcost.pricesAndCoefs['Зенковка'] * materials.length * works[work],
                string: `${selfcost.pricesAndCoefs['Зенковка'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость зенковки * Кол-во материалов * Кол-во зенковок'
            });
            break;

        case 'cutsv1':
            result.works.push({
                name: 'Вырез в стекле 1 кат',
                value: selfcost.pricesAndCoefs['Вырез в стекле 1 кат'] * materials.length * works[work],
                string: `${selfcost.pricesAndCoefs['Вырез в стекле 1 кат'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость выреза 1 кат * Кол-во материалов * Кол-во вырезов'
            });
            break;

        case 'cutsv2':
            result.works.push({
                name: 'Вырез в стекле 2 кат',
                value: selfcost.pricesAndCoefs['Вырез в стекле 2 кат'] * materials.length * works[work],
                string: `${selfcost.pricesAndCoefs['Вырез в стекле 2 кат'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость выреза 2 кат * Кол-во материалов * Кол-во вырезов'
            });
            break;

        case 'cutsv3':
            result.works.push({
                name: 'Вырез в стекле 3 кат',
                value: selfcost.pricesAndCoefs['Вырез в стекле 3 кат'] * materials.length * works[work],
                string: `${selfcost.pricesAndCoefs['Вырез в стекле 3 кат'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость выреза 3 кат * Кол-во материалов * Кол-во вырезов'
            });
            break;

        case 'tempered':
            works[work] && result.works.push({
                name: `Закалка ${thickness} мм`,
                value: selfcost.pricesAndCoefs[`Закалка ${thickness}`] * S,
                string: `${selfcost.pricesAndCoefs[`Закалка ${thickness}`] / 100}мм * ${S}`,
                formula: `Себестоимость закалки * площадь`
            });
            break;

        case 'cutting':
            result.works.push({
                name: 'Раскрой',
                value: selfcost.pricesAndCoefs['Раскрой стекла'],
                string: `${(selfcost.pricesAndCoefs['Раскрой стекла'] / 100).toFixed(2)}`,
                formula: 'Раскрой стекла'
            });
            break;

        case 'washing':
            result.works.push({
                name: 'Мойка',
                value: selfcost.pricesAndCoefs['Мойка'],
                string: `${(selfcost.pricesAndCoefs['Мойка'] / 100).toFixed(2)}`,
                formula: 'Мойка'
            });
            break;

        case 'grinding':
            result.works.push({
                name: 'Шлифовка',
                value: selfcost.pricesAndCoefs[`${stanok} Шлифовка`] * P,
                string: `${(selfcost.pricesAndCoefs[`${stanok} Шлифовка`] / 100).toFixed(2)} * ${P.toFixed(2)}`,
                formula: 'Себестоимость работы * Периметр'
            });
            break;

        case 'triplexing':
            result.works.push({
                name: 'Триплексование',
                value: selfcost.pricesAndCoefs[`Триплекс ${allThickness} мм`],
                string: `${(selfcost.pricesAndCoefs[`Триплекс ${allThickness} мм`] / 100).toFixed(2)}`,
                formula: `Фиксированная себестоимость триплексования для общей толщины (${allThickness})`
            });
            break;

        case 'print':
            works[work] && result.works.push({
                name: 'Печать',
                value: selfcost.pricesAndCoefs[`УФ печать`],
                string: `${selfcost.pricesAndCoefs[`УФ печать`] / 100}`,
                formula: 'Себестоимость уф печати'
            });
            break;

        // case 'color':
        //     works[work] && result.works.push({
        //         name: 'Окрашивание',
        //         value: selfcost.colors[works[work]].salePrices[1].value,
        //         string: `${selfcost.colors[works[work]].salePrices[1].value / 100}`,
        //         formula: 'Себестоимость окрашивания (ТУТ ПОКА СЕБЕСТОИМОСТЬ КРАСКИ ИЗ СПРАВОЧНИКА В МОЕМ СКЛАДЕ, ПЕРЕСМОТРТЕ ФОРМУЛУ)'
        //     });
        //     break;
            
        case 'cuts':
            result.works.push({
                name: 'Вырезы',
                value: selfcost.pricesAndCoefs['Вырезы СМД'] * works[work],
                string: `${selfcost.pricesAndCoefs['Вырезы СМД'] / 100} * ${works[work]}`,
                formula: 'Себестоимость вырезов * Кол-во вырезов'
            });
            break;

        case 'drillssmd':
            result.works.push({
                name: 'Сверление СМД',
                value: selfcost.pricesAndCoefs['Сверление СМД'] * materials.length * works[work],
                string: `${selfcost.pricesAndCoefs['Сверление СМД'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость работы * Кол-во материалов * Кол-во отверстий'
            });
            break;
    }
};

export default Calculate