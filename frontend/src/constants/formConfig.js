const formConfigs = {
    SMDForm: {
      commonFields: [
        {
          name: 'smdType',
          label: 'Тип СМД',
          type: 'select',
          options: ['Иное', 'Krystal', 'Round', 'Lux', 'Premium', 'Standart', 'Hexagon'],
          rules: [{ required: true, message: 'Fill this field' }]
        },{
          name: 'material',
          label: 'Материал',
          type: 'select',
          options: ['Стекло Matelux, 4 мм', 'Стекло осветленное OptiWhite, 4 мм', 'Стекло М1, 4 мм'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'width', type: 'input', label: 'Ширина, мм:', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'height', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'clientType',
          label: 'Тип клиента',
          type: 'select',
          options: ['VIP', 'Дилер', 'Опт', 'Розница'],
          rules: [{ required: true, message: 'Fill this field' }]
        },{
          name: 'marker',
          label: 'Маркер',
          type: 'select',
          options: ['Белый', 'Черный'],
          rules: [{ required: true, message: 'Fill this field' }]
        },{
          name: 'color',
          label: 'Цвет',
          type: 'select',
          options: [],
        },{
          name: 'print',
          label: 'Печать',
          type: 'select',
          options: ['Нет', 'С 1 стороны', 'С 2 сторон'],
        },
        { name: 'drillssmd', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'cuts', type: 'inputp0', label: 'Вырезы, шт' },
        { name: 'rounds', type: 'inputp0', label: 'Скругления, шт' },
        { name: 'notax', label: 'Optiwhite без наценки', type: 'checkbox' },
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
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'height', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'drills', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'zenk', type: 'inputp0', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'color', label: 'Цвет', type: 'select' },
        {
          name: 'print',
          label: 'Печать',
          type: 'select',
          options: ['Нет', 'С 1 стороны', 'С 2 сторон'],
        },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox', cheched: true },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox', cheched: true },
        { name: 'polishing', label: 'Полировка', type: 'checkbox' },
        {
          name: 'rounding',
          label: 'Округление',
          type: 'select',
          options: ['Округление до 0.5', 'Умножить на 2'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'customertype',
          label: 'Тип клиента',
          type: 'select',
          options: ['Выше госта', 'Менее 200 тыс.', 'Более 200 тыс.', 'Более 400 тыс.', 'Более 800 тыс.'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
      ]
    },
    triplexForm: {
      commonFields: [
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'height', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'drills', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'zenk', type: 'inputp0', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'color', label: 'Цвет', type: 'select' },
        {
          name: 'print',
          label: 'Печать',
          type: 'select',
          options: ['Нет', 'С 1 стороны', 'С 2 сторон'],
        },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox', cheched: true },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox', cheched: true },
        { name: 'polishing', label: 'Полировка', type: 'checkbox' },
        {
          name: 'addTape',
          label: 'Доп пленка',
          type: 'select',
          options: ['Пленка EVA Прозрачная 0,38 мм', 'Пленка EVA Прозрачная 0,76 мм'],
        },
        {
          name: 'rounding',
          label: 'Округление',
          type: 'select',
          options: ['Округление до 0.5', 'Умножить на 2'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'customertype',
          label: 'Тип клиента',
          type: 'select',
          options: ['Менее 200 тыс.', 'Более 200 тыс.', 'Более 400 тыс.', 'Более 800 тыс.'],
          rules: [{ required: true, message: 'Fill this field' }]
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
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'height', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'gas',
          label: 'Газ',
          type: 'select',
          options: ['Аргон'],
        },
        {
          name: 'customertype',
          label: 'Тип клиента',
          type: 'select',
          options: ['Менее 200 тыс.', 'Более 200 тыс.', 'Более 400 тыс.', 'Более 800 тыс.'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
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
          { name: 'tempered1', label: 'Закаленное', type: 'checkbox' },
          { name: 'polishing1', label: 'Полировка', type: 'checkbox' },
          { name: 'blunting1', label: 'Притупка', type: 'checkbox' }
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
          { name: 'tempered2', label: 'Закаленное', type: 'checkbox' },
          { name: 'polishing2', label: 'Полировка', type: 'checkbox' },
          { name: 'blunting2', label: 'Притупка', type: 'checkbox' }
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
          { name: 'tempered3', label: 'Закаленное', type: 'checkbox' },
          { name: 'polishing3', label: 'Полировка', type: 'checkbox' },
          { name: 'blunting3', label: 'Притупка', type: 'checkbox' }
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
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'height', type: 'input', label: 'Высота, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'blank', type: 'inputp0', label: 'Количество пятаков' },
        { name: 'color', label: 'Цвет', type: 'select' },
        { name: 'under', label: 'Подстолье', type: 'select' },
        {
          name: 'customertype',
          label: 'Тип клиента',
          type: 'select',
          options: ['Менее 200 тыс.', 'Более 200 тыс.', 'Более 400 тыс.', 'Более 800 тыс.'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
      ],materialFields: []
    }
  };
export default formConfigs