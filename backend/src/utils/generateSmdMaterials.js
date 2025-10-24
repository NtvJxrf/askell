import SkladService from '../services/sklad.service.js'

const getMeta = (code, color) => code ? smdMaterials[code]?.meta : SkladService.selfcost.colors[color]?.meta

export const generateSmdMaterials = (data, color, material) => {
    const materials = []
    const { result, initialData } = data
    const { width, height, smdType, marker } = initialData
    const { S, P } = result.other
    const larger = Math.max(width, height)

    const add = (stage, quantity, code) => {
        if (quantity > 0) {
            materials.push({
                processingProcessPosition: processPositionsMap[stage],
                assortment: { meta: getMeta(code, color) },
                quantity
            })
        }
    }
    materials.push({
        assortment: { meta: material},
        quantity: 1
    })
    const isKrystal = smdType === 'Krystal'

    // --- ОКР (окрашивание стекла)
    if (color) {
        add('ОКР (окрашивание стекла)', width * height * 0.0000003, null)              // Краска
        add('ОКР (окрашивание стекла)', P, 1060984)                                    // Лента термозащитная
    }

    // --- Подготовка лист мет ( для СМД)
    if (!isKrystal) {
        add('Подготовка лист мет ( для СМД)', P, 88797013951)                          // Лента прозрачная (красная)

        add('Подготовка лист мет ( для СМД)', larger >= 2000 ? 8 : (larger >= 1500 ? 6 : 0), 11111472) //Заклепка 4,8х6 тяговая потай ал/ст

        if (S > 1.5) {
            add('Подготовка лист мет ( для СМД)', Math.ceil(P / 1.5) / 10, 88797011862) // Лента белая (оранжевая)
        }

        add('Подготовка лист мет ( для СМД)', S * 1.05, 1060946)                        // Лист оцинкованный

        add('Подготовка лист мет ( для СМД)', larger > 2000 ? 4 : (larger > 1200 ? 3 : 0),1060939)// Подвеска регулируемая
    }

    // --- УПАКОВКА СМД
    add('УПАКОВКА СМД', 4, 1060929)                                                    // Уголок синий
    add('УПАКОВКА СМД', 1, 1060994)                                                    // Скотч "ОСТОРОЖНО СТЕКЛО"
    add('УПАКОВКА СМД', S < 1 ? 15 : 20, 1060836)                                       // Скрепки
    add('УПАКОВКА СМД', 2, 1061527)                                                    // Этикет-лента
    add('УПАКОВКА СМД', S < 1 ? width / 1000 : height / 1000, 1061166)                               // Пленка пузырчатая
    add('УПАКОВКА СМД', Math.ceil((S * 2) / 2.5), 11111529)                             // Картон бурый
    marker == 'Белый' ?  add('УПАКОВКА СМД', 1, 1060961) : add('УПАКОВКА СМД', 1, 1060866) 
    if (S >= 1.5) {
        add('УПАКОВКА СМД', 9, 11111712)                                               // Пенокартон
    }

    if (!isKrystal) {
        const qty = S < 1 ? 1 : (S < 2.5 ? 2 : 3)
        add('УПАКОВКА СМД', qty, 11111659)                                             // Сталь пуклевка
    }

    add('УПАКОВКА СМД', P / 2, 1060894)                                                // Скотч прозрачный

    // --- Сборка СМД
    if (!isKrystal) {
        add('Сборка СМД', Math.ceil(P / 1.5) / 100, 1060973)                           // Герметик
        if (larger > 1200) {
            add('Сборка СМД', 1, 1060962)                                              // Планка анодированная
        }
    }

    const qty = larger < 1500 ? 4 : 6
    add('Сборка СМД', qty, 1061565)                                                // Гайка М6
    add('Сборка СМД', qty, 1060899)                                                // Держатель Стандарт
    add('Сборка СМД', qty, 11111444)                                               // Прокладка сантех
    add('Сборка СМД', qty, 1061563)                                                // Шайба М6
    return materials
}
const processPositionsMap = {
    "ОКР (окрашивание стекла)" : {
        "meta": {
          "href": "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc/positions/430732f5-17cf-11ef-0a80-178100023cbd",
          "type": "processingprocessposition",
          "mediaType": "application/json"
        }
    },
    "Подготовка лист мет ( для СМД)": {
        "meta": {
          "href": "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc/positions/43073458-17cf-11ef-0a80-178100023cbe",
          "type": "processingprocessposition",
          "mediaType": "application/json"
        }
    },
    "Сборка СМД": {
        "meta": {
          "href": "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc/positions/430734a6-17cf-11ef-0a80-178100023cbf",
          "type": "processingprocessposition",
          "mediaType": "application/json"
        }
    },
    "УПАКОВКА СМД": {
        "meta": {
          "href": "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc/positions/430734e3-17cf-11ef-0a80-178100023cc0",
          "type": "processingprocessposition",
          "mediaType": "application/json"
        }
    },

}
const smdMaterials  = {
  "1060961": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/3e304cc5-81e7-11ed-0a80-0281000c7e3e",
      "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type" : "product",
      "mediaType" : "application/json",
      "uuidHref" : "https://online.moysklad.ru/app/#good/edit?id=3e304537-81e7-11ed-0a80-0281000c7e3c"
    },
    "name": "Маркер меловой белый"
  },
  "1060866": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/41bc57fa-81e7-11ed-0a80-0281000c81a5",
      "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type" : "product",
      "mediaType" : "application/json",
      "uuidHref" : "https://online.moysklad.ru/app/#good/edit?id=41bc525a-81e7-11ed-0a80-0281000c81a3"
    },
    "name": "Маркер черный BRAUBERG"
  },
  "1060836": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/414b1c95-81e7-11ed-0a80-0281000c812f",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=414b16c2-81e7-11ed-0a80-0281000c812d"
    },
    "name": "Скоба 73/12"
  },
  "1060894": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/407ea079-81e7-11ed-0a80-0281000c8077",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=407e9a4a-81e7-11ed-0a80-0281000c8075"
    },
    "name": "Скотч упаковочный прозрачный"
  },
  "1060899": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/405f43d3-81e7-11ed-0a80-0281000c804e",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=405f3dc8-81e7-11ed-0a80-0281000c804c"
    },
    "name": "Держатель Стандарт"
  },
  "1060929": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/4057a7f2-81e7-11ed-0a80-0281000c804a",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=4057a102-81e7-11ed-0a80-0281000c8048"
    },
    "name": "Уголок защитный синий 3-5 мм"
  },
  "1060939": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/4042eda1-81e7-11ed-0a80-0281000c8036",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=4042e74b-81e7-11ed-0a80-0281000c8034"
    },
    "name": "Подвеска регулируемая типа INDAUX"
  },
  "1060946": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/3fc010ce-81e7-11ed-0a80-0281000c7fb3",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=3fc00b3c-81e7-11ed-0a80-0281000c7fb1"
    },
    "name": "Лист оцинкованный  0,4 мм"
  },
  "1060962": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/403c5f58-81e7-11ed-0a80-0281000c802e",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=403c593d-81e7-11ed-0a80-0281000c802c"
    },
    "name": "Планка (крепежная полоса анодированная) 2000 мм"
  },
  "1060973": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/3ff9d7b0-81e7-11ed-0a80-0281000c7ff1",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=3ff9d22f-81e7-11ed-0a80-0281000c7fef"
    },
    "name": "Клей-герметик FIX ALL Crystal прозрачный SOUDAL  290 мл"
  },
  "1060984": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/3fffe066-81e7-11ed-0a80-0281000c7ffa",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=3fffda6f-81e7-11ed-0a80-0281000c7ff8"
    },
    "name": "Термолента 25 мм зеленая (двухсторонний скотч)"
  },
  "1060994": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/40869e33-81e7-11ed-0a80-0281000c807b",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=408698ac-81e7-11ed-0a80-0281000c8079"
    },
    "name": "Скотч \"ОСТОРОЖНО СТЕКЛО\""
  },
  "1061166": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/826efbbd-b8cd-11ed-0a80-02ad0020b514",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=826ef052-b8cd-11ed-0a80-02ad0020b512"
    },
    "name": "Пленка воздушно-пузырчатая 2/55 1200мм"
  },
  "1061527": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/6f533ffa-c3e7-11ed-0a80-0ed2002204f5",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=6f533669-c3e7-11ed-0a80-0ed2002204f3"
    },
    "name": "Этикетки 100х150 мм, термоЭКО (250 шт/рул, вт 40 мм)"
  },
  "1061563": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/43f735b4-c4bc-11ed-0a80-080c000f314a",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=43f72ba2-c4bc-11ed-0a80-080c000f3148"
    },
    "name": "Шайба увеличенная М6, цинк"
  },
  "1061565": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/82e04ffe-c4bc-11ed-0a80-07f0000ebd6a",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=82e0491d-c4bc-11ed-0a80-07f0000ebd68"
    },
    "name": "Гайка шестигранная низкая с фаской М6, цинк DIN439"
  },
  "11111444": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/874e66c5-cd32-11ed-0a80-03e500053de3",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=874e5eef-cd32-11ed-0a80-03e500053de1"
    },
    "name": "Прокладка Equation, 1/2, ПВХ"
  },
  "11111472": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/e356c2e7-cdfc-11ed-0a80-0efb001afbb2",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=e356bc94-cdfc-11ed-0a80-0efb001afbb0"
    },
    "name": "Заклепка 4,8х6 тяговая потай ал/ст"
  },
  "11111529": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/ebd475e0-cfa7-11ed-0a80-06340009e199",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=ebd46a1f-cfa7-11ed-0a80-06340009e197"
    },
    "name": "Гофролист Т22 1050х2500 мм"
  },
  "11111659": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/fd3c0e64-deaa-11ed-0a80-031d000d88c5",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=fd3bffb5-deaa-11ed-0a80-031d000d88c2"
    },
    "name": "Сталь пуклевка стандарт 100х100"
  },
  "11111712": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/c0133a53-e41d-11ed-0a80-00c2000d734d",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=c0132d12-e41d-11ed-0a80-00c2000d734a"
    },
    "name": "Пенокартон 30х30х10"
  },
  "88797013951": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/268f638c-8f65-11ee-0a80-0167000cb60d",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=268f5c7f-8f65-11ee-0a80-0167000cb60b"
    },
    "name": "SM 2708 Клеевая двуст. лента, основа - полиэфир, адгезив - акрил., прозрачн., 20мм х 50м"
  },
  "88797011862": {
    "meta": {
      "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/cabac4af-74a0-11ee-0a80-061b003616ec",
      "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      "type": "product",
      "mediaType": "application/json",
      "uuidHref": "https://online.moysklad.ru/app/#good/edit?id=cabaa000-74a0-11ee-0a80-061b003616ea"
    },
    "name": "SM WF11S Клеевая двуст. лента, основа - вспен. полиэтилен, адгезив - акрил., белый, 19мм х 50м"
  }
}