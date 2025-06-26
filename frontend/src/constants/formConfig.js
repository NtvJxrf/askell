const formConfigs = {
    SMDForm: {
      commonFields: [
        {
          name: 'smdType',
          label: 'Тип СМД',
          type: 'select',
          options: ['Иное', 'Krystal', 'Round', 'Lux', 'Premium', 'Standart', 'Hexagon'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'material',
          label: 'Материал',
          type: 'select',
          options: ['Стекло Matelux, 4 мм', 'Стекло осветленное OptiWhite, 4 мм', 'Стекло М1, 4 мм'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'height', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм:', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'clientType',
          label: 'Тип клитента',
          type: 'select',
          options: ['VIP', 'Дилер', 'Опт', 'Розница'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'color',
          label: 'Цвет',
          type: 'select',
          options: [],
        },
        { name: 'drillssmd', type: 'input', label: 'Сверление, шт' },
        { name: 'cuts', type: 'input', label: 'Вырезы, шт' },
        { name: 'rounds', type: 'input', label: 'Скругления, шт' },
        { name: 'print', label: 'Печать', type: 'checkbox' },
      ]
    },
    glassForm: {
      commonFields: [
        {
          name: 'material',
          label: 'Материал',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'height', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'drills', type: 'input', label: 'Сверление, шт' },
        { name: 'zenk', type: 'input', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'input', label: 'Вырезы 3 кат. шт' },
        { name: 'color', label: 'Цвет', type: 'select' },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox' },
        { name: 'polishing', label: 'Полировка', type: 'checkbox' },
        { name: 'print', label: 'Печать', type: 'checkbox' },
      ]
    },
    triplexForm: {
      commonFields: [
        { name: 'height', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'drills', type: 'input', label: 'Сверление, шт' },
        { name: 'zenk', type: 'input', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'input', label: 'Вырезы 3 кат. шт' },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox' },
        { name: 'polishing', label: 'Полировка', type: 'checkbox' },
        { name: 'print', label: 'Печать', type: 'checkbox' },
        {
          name: 'addTape',
          label: 'Доп пленка',
          type: 'select',
          options: ['Пленка EVA Прозрачная 0,38мм', 'Пленка EVA Прозрачная 0,76мм'],
        },
      ],
      materialFields: [
        {label: 'Материал 1', type: 'divider'},
        {
          name: 'material1',
          label: 'Материал',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {label: 'Пленка 1', type: 'divider'},
        {
          name: 'tape1',
          label: 'Пленка',
          type: 'select',
          options: ['Пленка EVA №25 Хамелеон Гладкий 1.4', 'Смарт пленка Magic Glass', 'Смарт-пленка белая (для Триплекса)', 'плёнка ORACAL 641-OOM 1.26x50ru', 'Пленка Boneva FORCE 0.76', 'Пленка EVA Orange (Оранжевая) 0,38 мм', 'Пленка EVA №1 Black Черная', 'Пленка EvoLam 0,38мм  2,1х50 м (Blue T (синяя))', 'Пленка EVA №2 White (БЕЛАЯ)-MILK(молоко)', 'Пленка EVA Green (зелёный) 0,38мм', 'Пленка EVA Bronze (бронза) 0,38мм', 'пленка EVA №6 Серая непрозрачная', 'Пленка EVA Super White (насыщенно белая) 0,38мм', 'Пленка EVA Black (чёрная) 0,38мм', 'Пленка EVA yellow (желтый) 0,38мм', 'Пленка EVA №7 Бежевая непрозрачная', 'Пленка EVA sapphire (сапфир) 0,38мм', 'Пленка EVA White (белая) 0,38мм', 'пленка EVA №3 FS (САТИН)', 'Пленка EVA Grey (серая) 0,38мм', 'Пленка EVA №24 черная прозрачная- Dark Grey (темно-серая)'],
        },
        {label: 'Материал 2', type: 'divider'},
        {
          name: 'material2',
          label: 'Материал',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        }
      ]
    },
    glasspacketForm: {
      commonFields: [
        { name: 'height', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'gas',
          label: 'Газ',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        }
      ],
      materialFields: [
        [
          {
            name: 'material1',
            label: 'Материал 1',
            type: 'select',
            options: [],
            rules: [{ required: true, message: 'Fill this field' }]
          },
          { name: 'tempered', label: 'Закаленное', type: 'checkbox' }
        ],
        [
          {
            name: 'plane1',
            label: 'Рамка 1',
            type: 'select',
            options: [],
            rules: [{ required: true, message: 'Fill this field' }]
          }
        ],
        [
          {
            name: 'material2',
            label: 'Материал 2',
            type: 'select',
            options: [],
            rules: [{ required: true, message: 'Fill this field' }]
          },
          { name: 'tempered', label: 'Закаленное', type: 'checkbox' }
        ],
        [
          {
            name: 'plane2',
            label: 'Рамка 2',
            type: 'select',
            options: [],
          }
        ],
        [
          {
            name: 'material3',
            label: 'Материал 3',
            type: 'select',
            options: [],
          },
          { name: 'tempered', label: 'Закаленное', type: 'checkbox' }
        ]
      ]
    },
    ceraglassForm: {
      commonFields: [
        {
          name: 'material1',
          label: 'Материал 1',
          type: 'select',
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'material2',
          label: 'Материал 2',
          type: 'select',
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'height', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'input', label: 'Вырезы 3 кат. шт' },
        { name: 'blank', type: 'input', label: 'Количество пятаков' },
        { name: 'color', label: 'Цвет', type: 'select' },
        { name: 'under', label: 'Подстолье', type: 'select' },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
      ],materialFields: [

      ]
    },
    typeMap: { //['Зеркало', 'Стекло', 'Стеновая панель', 'Кухонный фартук']
      'Зеркало': ['Mirox Bronze', 'Mirox Grey', 'Mirox', 'Morena'],
      'Стекло': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze', 'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'], 
      'Стеновая панель': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze', 'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
      'Кухонный фартук': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze',  'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru'],
    }
  };
export default formConfigs