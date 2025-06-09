const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding, trim } = data
    const tapes = Object.entries(data).filter(([key]) => key.startsWith('tape')).map(([_, value]) => value);
    const materials = Object.entries(data).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    addTape && tapes.push(addTape)
    const works = { polishing, drills, zenk, cutsv1, cutsv2 }
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? 'Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    let S = (height * width) / 1000000
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
    //Если выбрали 'Пленка EVA Прозрачная 0,38мм', то их считать 2 шт
    //Если выбрали 'Пленка EVA Прозрачная 0,76мм', то считать ее одну
    //Если цветная пленка (Все остальные кроме смарт и хамелеон), то считать выбранную + 'Пленка EVA Прозрачная 0,38мм'
    //Если смарт, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,76мм'
    //Если хамелеон, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,38мм'
    //Себестоимость пленки будет S_tape * себестоимость пленок * кол-во
    let S_tape = null
    if(larger <= 2100) S_tape = (2100 * lesser) / 1000000
    else S_tape = (2100 * larger) / 1000000    // Считаем площадь используемой пленки | 2100 это ширина рулона
    for (const tape of tapes) {
        switch (tape) {
            case undefined:
                result.materials.push({
                    name: 'Пленка EVA Прозрачная 0,38мм',
                    value: selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value * S_tape * 2,
                    count: S_tape * 2,
                    string: `${selfcost.materials['Пленка EVA Прозрачная 0,38мм'].salePrices[0].value / 100} * ${S_tape.toFixed(2)} * 2`,
                    formula: 'Цена за м² * Площадь плёнки * 2 слоя'
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
                value: selfcost.works[`Закалка ${thickness}`] * S,
                string: `${selfcost.works[`Закалка ${thickness}`] / 100}мм * ${S}`,
                formula: `Себестоимость закалки * площадь`
        });


        result.materials.push({
            name: material,
            value: selfcost.materials[material].salePrices[0].value * S * trim,
            string: `${selfcost.materials[material].salePrices[0].value / 100} * ${S.toFixed(2)} * ${trim}`,
            formula: 'Цена за м² * Площадь * Коэффициент обрези'
        });
    }
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'

    result.works.push({
        name: 'Раскрой',
        value: selfcost.works[`Раскрой стекла`],
        string: `${(selfcost.works[`Раскрой стекла`] / 100).toFixed(2)}`,
        formula: 'Раскрой стекла'
    });

    result.works.push({
        name: 'Мойка',
        value: selfcost.works[`Мойка`],
        string: `${(selfcost.works[`Мойка`] / 100).toFixed(2)}`,
        formula: 'Мойка'
    });

    result.works.push({
        name: 'Шлифовка',
        value: selfcost.works[`${stanok} Шлифовка`] * P,
        string: `${(selfcost.works[`${stanok} Шлифовка`] / 100).toFixed(2)} * ${P.toFixed(2)}`,
        formula: 'Себестоимость работы * Периметр'
    });

    result.works.push({
        name: 'Триплексование',
        value: selfcost.works[`Триплекс ${allThickness} мм`],
        string: `${(selfcost.works[`Триплекс ${allThickness} мм`] / 100).toFixed(2)}`,
        formula: `Фиксированная себестоимость триплексования для общей толщины (${allThickness})`
    });

    const context = { works, selfcost, result, materials, P, stanok };
    for (const work in works) {
        if (work === 0) continue;
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
    const price = workshopExpenses + commercialExpenses + householdExpenses + materialsandworks
    result.other = {
        S,
        S_tape,
        P,
        trim,
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
            selfcost,
            result
    }
}


const constructWorks = (work, context)=> {
    const { works, selfcost, result, materials, P, stanok } = context;

    switch (work) {
        case 'polishing':
            if (works[work]) {
                result.works.push({
                    name: 'Полировка',
                    value: selfcost.works[`${stanok} Полировка`] * P,
                    string: `${selfcost.works[`${stanok} Полировка`] / 100} * ${P.toFixed(2)}`,
                    formula: 'Себестоимость работы * Периметр'
                });
            }
            break;

        case 'drills':
            result.works.push({
                name: 'Сверление',
                value: selfcost.works['Сверление стекла, керамики'] * materials.length * works[work],
                string: `${selfcost.works['Сверление стекла, керамики'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость работы * Кол-во материалов * Кол-во отверстий'
            });
            break;

        case 'zenk':
            result.works.push({
                name: 'Зенковка',
                value: selfcost.works['Зенковка'] * materials.length * works[work],
                string: `${selfcost.works['Зенковка'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость зенковки * Кол-во материалов * Кол-во зенковок'
            });
            break;

        case 'cutsv1':
            result.works.push({
                name: 'Вырез в стекле 1 кат',
                value: selfcost.works['Вырез в стекле 1 кат'] * materials.length * works[work],
                string: `${selfcost.works['Вырез в стекле 1 кат'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость выреза 1 кат * Кол-во материалов * Кол-во вырезов'
            });
            break;

        case 'cutsv2':
            result.works.push({
                name: 'Вырез в стекле 2 кат',
                value: selfcost.works['Вырез в стекле 2 кат'] * materials.length * works[work],
                string: `${selfcost.works['Вырез в стекле 2 кат'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость выреза 2 кат * Кол-во материалов * Кол-во вырезов'
            });
            break;

        case 'cutsv3':
            result.works.push({
                name: 'Вырез в стекле 3 кат',
                value: selfcost.works['Вырез в стекле 3 кат'] * materials.length * works[work],
                string: `${selfcost.works['Вырез в стекле 3 кат'] / 100} * ${materials.length} * ${works[work]}`,
                formula: 'Себестоимость выреза 3 кат * Кол-во материалов * Кол-во вырезов'
            });
            break;
    }
}
export default Calculate