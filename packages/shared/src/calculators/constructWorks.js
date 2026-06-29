export default function constructWorks(work, quantity, context, multiplier) {
    const { selfcost, result, thickness, P, S} = context;
    const res = (name, tableName) => {
        const PAC = selfcost.pricesAndCoefs
        const workConfig = PAC[tableName || name]
        let ratePerHour = workConfig.ratePerHour
        // if(context.type == 'Стеклопакет' && !work.includes('tempered')){
        //     let uom = null
        //     switch(work){
        //         case 'tempered4':
        //         case 'tempered5':
        //         case 'tempered6':
        //         case 'tempered8':
        //         case 'tempered10':
        //         case 'tempered12':
        //             uom = S
        //         default:
        //             uom = P
        //     }
        //     ratePerHour = workConfig.productivity * workConfig.loadFactor / uom * 60
        // }
        const value = (quantity * workConfig.costOfWork)
            + (workConfig.salary / PAC['Среднее количество рабочих часов в месяц'].value * quantity / ratePerHour)
        const place = workConfig.place
        const workshopExpenses = value * PAC[`% цеховых расходов ${place}`].value
        const commercialExpenses = value * (name.toLowerCase().includes('триплекс') ? PAC[`% коммерческих расходов Селькоровская`].value : PAC[`% коммерческих расходов ${place}`].value)
        const householdExpenses = value * PAC[`% общехозяйственных расходов ${place}`].value
        const allExpenses = workshopExpenses + commercialExpenses + householdExpenses
        const tax = context.type == 'Стеклопакет' ? value * PAC['Налог на зарплату'].value : 0
        result.works.push({
            name,
            finalValue: (value + allExpenses + tax) * (multiplier || 1),
            value,
            tax,
            workshopExpenses,
            commercialExpenses,
            householdExpenses,
            string: `(${quantity.toFixed(2)} * ${workConfig.costOfWork}) + (${workConfig.salary} / ${PAC['Среднее количество рабочих часов в месяц'].value} * ${quantity.toFixed(2)} / ${ratePerHour})${multiplier ? ` * ${multiplier}` : ''}`,
            formula: `(Количество * Сделка) + (Оклад / Среднее количество рабочих часов в месяцe * Количество / Норма в час)${multiplier ? ` * Коэффициент` : ''}`
        })
    }
    switch (work) {
        case 'drills': res('Сверление'); break
        case 'zenk': res('Зенковка'); break
        case 'cutsv1': res('Вырез в стекле 1 кат'); break
        case 'cutsv2': res('Вырез в стекле 2 кат'); break
        case 'cutsv3': res('Вырез в стекле 3 кат'); break
        case 'tempered': res(`Закалка`); break
        case 'tempered4': res(`Закалка 4`); break
        case 'tempered5': res(`Закалка 5`); break
        case 'tempered6': res(`Закалка 6`); break
        case 'tempered8': res(`Закалка 8`); break
        case 'tempered10': res(`Закалка 10`); break
        case 'tempered12': res(`Закалка 12`); break

        case 'cutting1': res('Резка (Управление)'); break
        case 'cutting2': res('Резка (Помощь)'); break
        case 'washing1': res('Мойка 1'); break

        case 'polishingCurved': res('КР Полировка'); break
        case 'polishingStraight': res('ПР Полировка'); break
        case 'grindingCurved': res('КР Шлифовка'); break
        case 'grindingStraight': res('ПР Шлифовка'); break
        case 'bluntingStraight': res('ПР Притупка'); break
        case 'bluntingLowE': res('ПР Притупка LowE'); break
        // case 'blunting': res(`Притупка ${thickness} мм`); break

        case 'triplexing1': res(`Триплекс зачистка`); break
        case 'triplexing2': res(`Триплекс сборка`); break
        
        case 'ceramicProcessing': res(`Триплекс сборка`); break //ТК НЕТ КОЭФА, ТО НАЗЫВАЕТСЯ ТАК ЖЕ, И ЦЕНА ЗА ПЛОЩАДЬ

        case 'otk': res(`ОТК`); break
        case 'sealing': res(`Первичная герметизация`); break
        case 'sealing2': res(`Вторичная герметизация`); break
        case 'assembleGlasspacket': res(`Сборка стеклопакета`); break
        case 'assemblePlane': res(`Изготовление рамки`); break
        case 'lamination': res(`Ламинирование`); break
        case 'cuttingCera': res(`Резка керамики`); break
        case 'color': res(`Окрашивание`); break
    }
};