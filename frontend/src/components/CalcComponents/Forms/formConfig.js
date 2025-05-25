
const formConfigs = {
    SMDForm: {
      fields: [
        {
          name: 'smdType',
          label: 'Тип СМД',
          type: 'select',
          options: ['Иное', 'Люкс', 'Круг'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        { name: 'height', type: 'input', label: 'Высота изделия, мм', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина изделия, мм:', rules: [{ required: true, message: 'Fill this field' }] },
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
      fields: [
        {
          name: 'type',
          label: 'Тип изделия',
          type: 'select',
          options: ['Зеркало', 'Стекло', 'Стеновая панель', 'Кухонный фартук'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'material',
          label: 'Тип изделия',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'thickness',
          label: 'Толщина',
          type: 'select',
          options: [],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'shape',
          label: 'Прямоугольная форма',
          type: 'checkbox',
        },
        {
          name: 'tempered',
          label: 'Закаленное',
          type: 'checkbox',
        },
        {
          name: 'processing',
          label: 'Обработка',
          type: 'select',
          options: ['Полировка', 'Шлифовка'],
          rules: [{ required: true, message: 'Fill this field' }]
        },
        {
          name: 'print',
          label: 'Печать',
          type: 'checkbox',
        },
        { name: 'length', type: 'input', label: 'Длина', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'width', type: 'input', label: 'Ширина', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'drills', type: 'input', label: 'Сверление, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'zenk', type: 'input', label: 'Зенкование, шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv1', type: 'input', label: 'Вырезы 1 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
        { name: 'cutsv2', type: 'input', label: 'Вырезы 2 кат. шт', rules: [{ required: true, message: 'Fill this field' }] },
      ]
    }
  };
  export default formConfigs