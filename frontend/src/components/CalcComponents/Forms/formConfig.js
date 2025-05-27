
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
        {
          name: 'type',
          label: 'Тип',
          type: 'select',
          options: ['Триплекс', 'Триплекс декор', 'Цветное зеркало'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'length', type: 'input', label: 'Длина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина, мм', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'processing',
          label: 'Обработка',
          type: 'select',
          options: ['Полировка', 'Шлифовка'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'drills', type: 'input', label: 'Сверление, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'zenk', type: 'input', label: 'Зенкование, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
        {
          name: 'color',
          label: 'Окрашивание с обратной стороны',
          type: 'select',
          options: ['Нет', 'Красный', 'Черный', 'Розовый'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'tape',
          label: 'Пленка',
          type: 'select',
          options: ['Декор', 'Смарт'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'tempered', label: 'Закаленное', type: 'checkbox' },
        { name: 'shape', label: 'Прямоугольная форма', type: 'checkbox' },
        { name: 'print', label: 'Печать', type: 'checkbox' },
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
      'Кухонный фартук': ['Arctic Blue', 'Matelux Bronze', 'Matelux Crystalvision', 'Matelux Grey', 'Matelux', 'Зеркальное Stopsol Bronze',  'Зеркальное Stopsol Grey', 'Зеркальное Stopsol', 'M1', 'Осветленное Crystalvision', 'Осветленное OptiWhite', 'Тонированное Bronze', 'Тонированное Grey', 'Узорчатое Moru']
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