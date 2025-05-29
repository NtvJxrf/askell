import { useSelector } from "react-redux"
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    const { length, width, processing, drills, zenk, cutsv1, cutsv2, tempered, shape, print, material1, material2, material3, thickness1, thickness2, thickness3, tape1, tape2, customertype, rounding, trim } = data
    const tapes = [tape1, tape2]
    const materials = [ material1, material2, material3 ]

    const larger = Math.max(length, width)
    const lesser = Math.min(length, width)
    const result = {
        materials: {

        },
        works: {

        },
        other: {

        }
    }
    //Если выбрали 'Пленка EVA Прозрачная 0,38мм', то их считать 2 шт
    //Если выбрали 'Пленка EVA Прозрачная 0,76мм', то считать ее одну
    //Если цветная пленка (Все остальные кроме смарт и хамелеон), то считать выбранную + 'Пленка EVA Прозрачная 0,38мм'
    //Если смарт, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,76мм'
    //Если хамелеон, то считать выбранную + 2 шт 'Пленка EVA Прозрачная 0,38мм'
    //Себестоимость пленки будет S_tape * себестоимость пленок * кол-во
    let S_tape = null    // Считаем площадь используемой пленки
    larger <= 2100 ? S_tape = (2100 * lesser) / 1000000 : S_tape = (2100 * larger) / 1000000 //2100 это ширина рулона
    console.log(S_tape)
    for (const tape of tapes) {
        if(!tape) continue 
        const mats = result.materials
        switch (tape) {
            case 'Пленка EVA Прозрачная 0,38мм':
                mats['Пленка EVA Прозрачная 0,38мм'] = (mats['Пленка EVA Прозрачная 0,38мм'] || 0) + 2;
                break;
            case 'Пленка EVA Прозрачная 0,76мм':
                mats['Пленка EVA Прозрачная 0,76мм'] = (mats['Пленка EVA Прозрачная 0,76мм'] || 0) + 1;
                break;
            case 'Смарт пленка Magic Glass':
                mats[tape] = (mats[tape] || 0) + 1;
                mats['Пленка EVA Прозрачная 0,76мм'] = (mats['Пленка EVA Прозрачная 0,76мм'] || 0) + 2;
                break;
            case 'Пленка EVA №25 Хамелеон Гладкий 1.4':
                mats[tape] = (mats[tape] || 0) + 1;
                mats['Пленка EVA Прозрачная 0,38мм'] = (mats['Пленка EVA Прозрачная 0,38мм'] || 0) + 2;
                break;
            default:
                mats[tape] = (mats[tape] || 0) + 1;
                mats['Пленка EVA Прозрачная 0,38мм'] = (mats['Пленка EVA Прозрачная 0,38мм'] || 0) + 1;
        }
    }
    for(const material of materials){
        if(!material) continue

        
    }
    console.log(result)
    


    return {
        
    }
}

export default Calculate