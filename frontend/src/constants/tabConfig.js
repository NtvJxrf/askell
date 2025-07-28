export const tabConfigs = [
  {
    key: 'coefs',
    title: 'Коэффициенты',
    fields: ['name', 'value', 'description'],
    columns: [
      { title: 'Название', dataIndex: 'name' },
      { title: 'Значение', dataIndex: 'value' },
      { title: 'Описание', dataIndex: 'description' },
    ]
  },
  {
    key: 'prices',
    title: 'Цены',
    fields: ['name', 'value', 'description'],
    columns: [
      { title: 'Название', dataIndex: 'name' },
      { title: 'Значение', dataIndex: 'value' },
      { title: 'Описание', dataIndex: 'description' },
    ]
  },
  {
    key: 'work_prices',
    title: 'Работы',
    fields: ['name', 'ratePerHour', 'costOfWork', 'salary', 'place', 'description'],
    columns: [
      { title: 'Название', dataIndex: 'name' },
      { title: 'Норма в час', dataIndex: 'ratePerHour' },
      { title: 'Сделка', dataIndex: 'costOfWork' },
      { title: 'Оклад', dataIndex: 'salary' },
      { title: 'Где выполняется', dataIndex: 'place' },
      { title: 'Описание', dataIndex: 'description' },
    ]
  }
];
