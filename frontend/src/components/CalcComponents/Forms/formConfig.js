
const formConfigs = {
    SMDForm: {
      commonFields: [
        {
          name: 'smdType',
          label: 'Тип СМД',
          type: 'select',
          options: ['Иное', 'Люкс', 'Круг'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'height', type: 'input', label: 'Высота изделия, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм изделия, мм:', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'glassType',
          label: 'Вид стекла',
          type: 'select',
          options: ['M1', 'OptiWhite', 'Matelux'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'color',
          label: 'Цвет',
          type: 'select',
          options: ['Красный', 'Черный', 'Розовый'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'print',
          label: 'Печать',
          type: 'checkbox',
        },
        { name: 'rounds', type: 'input', label: 'Количество скруглений', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cuts', type: 'input', label: 'Количество вырезов', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'clientType',
          label: 'Тип клиента',
          type: 'select',
          options: ['VIP', 'Дилер', 'Опт', 'Розница'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
      ]
    },
    glassForm: {
      commonFields: [
        {
          name: 'type',
          label: 'Тип изделия',
          type: 'select',
          options: ['Зеркало', 'Стекло', 'Стеновая панель', 'Кухонный фартук'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'material',
          label: 'Материал',
          type: 'select',
          options: ['crystalvision'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'thickness',
          label: 'Толщина, мм',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'processing',
          label: 'Обработка',
          type: 'select',
          options: ['Полировка', 'Шлифовка'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox' },
        { name: 'print', label: 'Печать', type: 'checkbox' },
        { name: 'length', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'drills', type: 'input', label: 'Сверление, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'zenk', type: 'input', label: 'Зенкование, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
      ]
    },
    triplexForm: {
      commonFields: [
        { name: 'length', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'processing',
          label: 'Обработка',
          type: 'select',
          options: ['Полировка', 'Шлифовка'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'color',
          label: 'Цвет',
          type: 'select',
          options: ['Красненький', 'Зелененький'],
        },
        { name: 'drills', type: 'input', label: 'Сверление, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'zenk', type: 'input', label: 'Зенкование, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox' },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
        { name: 'print', label: 'Печать', type: 'checkbox' },
      ],
      materialFields: [
        {label: 'Материал 1', type: 'divider'},
        {
          name: 'material1',
          label: 'Материал',
          type: 'select',
          options: ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze',  'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'thickness1',
          label: 'Толщина, мм',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {label: 'Пленка 1', type: 'divider'},
        {
          name: 'tape1',
          label: 'Пленка',
          type: 'select',
          options:   ['Пленка EVA Прозрачная 0,38мм', 'Пленка EVA Прозрачная 0,76мм', 'Пленка EVA №25 Хамелеон Гладкий 1.4', 'Смарт пленка Magic Glass', 'Смарт-пленка белая (для Триплекса)', 'плёнка ORACAL 641-OOM 1.26x50ru', 'Пленка Boneva FORCE 0.76', 'Пленка EVA Orange (Оранжевая) 0,38 мм', 'Пленка EVA №1 Black Черная', 'Пленка EvoLam 0,38мм  2,1х50 м (Blue T (синяя))', 'Пленка EVA №2 White (БЕЛАЯ)-MILK(молоко)', 'Пленка EVA Green (зелёный) 0,38мм', 'Пленка EVA Bronze (бронза) 0,38мм', 'пленка EVA №6 Серая непрозрачная', 'Пленка EVA Super White (насыщенно белая) 0,38мм', 'Пленка EVA Black (чёрная) 0,38мм', 'Пленка EVA yellow (желтый) 0,38мм', 'Пленка EVA №7 Бежевая непрозрачная', 'Пленка EVA sapphire (сапфир) 0,38мм', 'Пленка EVA White (белая) 0,38мм', 'пленка EVA №3 FS (САТИН)', 'Пленка EVA Grey (серая) 0,38мм', 'Пленка EVA №24 черная прозрачная- Dark Grey (темно-серая)'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {label: 'Материал 2', type: 'divider'},
        {
          name: 'material2',
          label: 'Материал',
          type: 'select',
          options: ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze',  'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'thickness2',
          label: 'Толщина, мм',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {label: 'Пленка 2', type: 'divider'},
        {
          name: 'tape2',
          label: 'Пленка',
          type: 'select',
          options:   ['Пленка EVA Прозрачная 0,38мм', 'Пленка EVA Прозрачная 0,76мм', 'Пленка EVA №25 Хамелеон Гладкий 1.4', 'Смарт пленка Magic Glass', 'Смарт-пленка белая (для Триплекса)', 'плёнка ORACAL 641-OOM 1.26x50ru', 'Пленка Boneva FORCE 0.76', 'Пленка EVA Orange (Оранжевая) 0,38 мм', 'Пленка EVA №1 Black Черная', 'Пленка EvoLam 0,38мм  2,1х50 м (Blue T (синяя))', 'Пленка EVA №2 White (БЕЛАЯ)-MILK(молоко)', 'Пленка EVA Green (зелёный) 0,38мм', 'Пленка EVA Bronze (бронза) 0,38мм', 'пленка EVA №6 Серая непрозрачная', 'Пленка EVA Super White (насыщенно белая) 0,38мм', 'Пленка EVA Black (чёрная) 0,38мм', 'Пленка EVA yellow (желтый) 0,38мм', 'Пленка EVA №7 Бежевая непрозрачная', 'Пленка EVA sapphire (сапфир) 0,38мм', 'Пленка EVA White (белая) 0,38мм', 'пленка EVA №3 FS (САТИН)', 'Пленка EVA Grey (серая) 0,38мм', 'Пленка EVA №24 черная прозрачная- Dark Grey (темно-серая)']
        },
        {label: 'Материал 3', type: 'divider'},
        {
          name: 'material3',
          label: 'Материал',
          type: 'select',
          options: ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze',  'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
        },
        {
          name: 'thickness3',
          label: 'Толщина, мм',
          type: 'select',
          options: [],
        },
      ]
    },
    ceraglassForm: {
      commonFields: [
        {
          name: 'type',
          label: 'Тип',
          type: 'select',
          options: ['Стол', 'Столешница', 'Дверное полотно', 'Иное'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
        { name: 'length', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'length', type: 'input', label: 'Деталей в изделии, шт', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'under',
          label: 'Подстолье',
          type: 'select',
          options: ['Солоники', 'Малет 1', 'Спирит 1'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
      ]
    },
    typeMap: { //['Зеркало', 'Стекло', 'Стеновая панель', 'Кухонный фартук']
      'Зеркало': ['Mirox Bronze', 'Mirox Grey', 'Mirox', 'Morena'],
      'Стекло': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze', 'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'], 
      'Стеновая панель': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze', 'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
      'Кухонный фартук': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze',  'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
    },
    thicknessMap: {
      'Arctic Blue': [4, 6],                      //Стекло
      'Matelux Bronze': [8],
      'Matelux Crystalvision': [8, 4],
      'Matelux Grey': [8],
      'Matelux': [4, 6, 8, 10],
      'Зеркальное Stopsol Bronze': [4, 6, 8, 10],
      'Зеркальное Stopsol Grey': [4, 6, 8, 10],
      'Зеркальное Stopsol': [4, 5, 6, 8, 10],
      'M1': [2, 3, 4, 5, 6, 8, 10, 12],
      'Осветленное Crystalvision': [4, 6, 8, 10],
      'Осветленное OptiWhite': [4, 5, 6, 8, 10, 12],
      'Тонированное Bronze': [4, 5, 6, 8, 10],
      'Тонированное Grey': [4, 5, 6, 8, 10],
      'Узорчатое Moru': [4, 8],                   //Стекло

      'Mirox Bronze': [4],                        //Зеркало
      'Mirox Grey': [4],
      'Mirox': [4, 5, 6],
      'Morena': [4],                              //Зеркало
    }
  };
export default formConfigs