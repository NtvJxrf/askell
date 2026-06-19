// Calculator tab definitions. Each tab maps to a form component (see ./forms).
// `id` is used as the active-tab key; `label` is what the user sees in the
// switcher. To add a calculator: create a form in ./forms and add an entry here.
export const CALCULATOR_TABS = [
  { id: 'smd', label: 'СМД' },
  { id: 'glass', label: 'Стекло' },
  { id: 'triplex', label: 'Триплекс' },
  { id: 'keraglass', label: 'Керагласс' },
  { id: 'glasspacket', label: 'Стеклопакет' },
  { id: 'tempering', label: 'Закалка' },
  // `align: 'right'` pushes the tab to the far right of the switcher.
  { id: 'limitations', label: 'Ограничения', align: 'right' },
];

// ---------------------------------------------------------------------------
// Calculator form schemas (declarative).
//
// Each calculator form is described by an object: a list of `fields` and a list
// of `buttons`. The generic renderer in ./forms/DynamicForm builds the UI from
// this — so adding/removing a field is just editing the array below.
//
// FIELD SHAPE:
//   {
//     name:         'width',            // variable name (form field key) — required
//     label:        'Ширина, мм',       // visible label — required (except 'group')
//     type:         'number',           // 'text' | 'number' | 'select' | 'checkbox' | 'group'
//     required:     true,               // optional — shows a red asterisk
//     info:         'Подсказка…',       // optional — shows an ⓘ icon with this tooltip
//     defaultValue: 0,                  // optional — initial value (boolean for checkbox)
//     column:       'left' | 'right',   // optional — which column (default 'left')
//     options:      [                   // for type 'select' — fill later
//       { value: 'a', label: 'Вариант A' },
//     ],
//   }
//
// REPEATABLE GROUP (type: 'group') — used by Триплекс «ПФ» stack. Renders an
// interleaved материал/пленка list (материал 1, пленка 1, материал 2, …) where
// «Добавить ПФ» / «Удалить ПФ» add or remove one пленка + one материал pair
// (never below `min`). Materials always = films + 1.
//   {
//     type:        'group',
//     name:        'layers',
//     column:      'right',
//     addLabel:    'Добавить ПФ',
//     removeLabel: 'Удалить ПФ',
//     min:         1,                    // starting number of пленки
//     material:    { name: 'material', label: 'Материал', type: 'select', required: true, options: [] },
//     film:        { name: 'film',     label: 'Пленка',   type: 'select', options: [] },
//   }
//
// BUTTON SHAPE:
//   { name: 'calculate', label: 'Рассчитать', variant: 'primary' }  // text button
//   { name: 'lightning', icon: 'zap' }                              // icon-only button
//   variant: 'primary' | 'default' (default) ; icon: 'zap' (only icon supported for now)
// ---------------------------------------------------------------------------

// Reusable button presets.
const BTN = {
  calculate: { name: 'calculate', label: 'Рассчитать', variant: 'primary' },
  clear: { name: 'clear', label: 'Очистить форму' },
  ai: { name: 'ai', label: 'ИИ' },
  lightning: { name: 'lightning', icon: 'zap' },
};

export const CALCULATOR_FORMS = {
  // СМД — fields to be filled in later.
  smd: {
    fields: [        {
          name: 'smdType',
          label: 'Тип СМД',
          type: 'select',
          options: ['Иное', 'Krystal', 'Round', 'Lux', 'Premium', 'Standart', 'Hexagon'],
          required: true
        },
        {
          name: 'material',
          label: 'Материал',
          type: 'select',
          options: ['Стекло Matelux, 4 мм', 'Стекло осветленное OptiWhite, 4 мм', 'Стекло М1, 4 мм'],
          required: true
        },
        { name: 'width', type: 'input', label: 'Ширина, мм:', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        {
          name: 'marker',
          label: 'Маркер',
          type: 'select',
          options: ['Белый', 'Черный'],
          required: true
        },
        { name: 'magnets', type: 'input', label: 'Магниты, шт' },
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
        { name: 'notax', label: 'Optiwhite без наценки', type: 'checkbox' },
        { name: 'quantity', type: 'input', label: 'Количество, шт' },
      ],
    buttons: [BTN.calculate, BTN.clear, BTN.lightning],
  },

  // Стекло
  glass: {
    fields: [
      { name: 'material', label: 'Материал', type: 'select', required: true, options: [] },
      { name: 'width', label: 'Ширина, мм', type: 'number', required: true },
      { name: 'height', label: 'Высота, мм', type: 'number', required: true },
      { name: 'processing', label: 'Вид обработки', type: 'select', required: true, options: [] },
      { name: 'drills', label: 'Сверление, шт', type: 'number' },
      { name: 'zenk', label: 'Зенкование, шт', type: 'number' },
      { name: 'cutsv1', label: 'Вырезы 1 кат. шт', type: 'number' },
      { name: 'cutsv2', label: 'Вырезы 2 кат. шт', type: 'number' },
      { name: 'cutsv3', label: 'Вырезы 3 кат. шт', type: 'number' },
      { name: 'color', label: 'Цвет', type: 'select', options: [] },
      { name: 'print', label: 'Печать, м2', type: 'number' },
      {
        name: 'shape',
        label: 'Прямоугольная форма',
        type: 'checkbox',
        defaultValue: true,
        info: 'Углы строго 90°',
      },
      { name: 'tempered', label: 'Закаленное', type: 'checkbox', defaultValue: true },
      { name: 'quantity', label: 'Количество, шт', type: 'number' },
      {
        name: 'rounding',
        label: 'Округление',
        type: 'select',
        required: true,
        info: 'Правило округления размеров',
        options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'],
      },
    ],
    buttons: [BTN.calculate, BTN.clear, BTN.ai, BTN.lightning],
  },

  // Триплекс — two columns + repeatable «ПФ» stack on the right.
  triplex: {
    fields: [
      { name: 'width', label: 'Ширина, мм', type: 'number', required: true },
      { name: 'height', label: 'Высота, мм', type: 'number', required: true },
      { name: 'processing', label: 'Вид обработки', type: 'select', required: true, options: [] },
      { name: 'drills', label: 'Сверление, шт', type: 'number' },
      { name: 'zenk', label: 'Зенкование, шт', type: 'number' },
      { name: 'cutsv1', label: 'Вырезы 1 кат. шт', type: 'number' },
      { name: 'cutsv2', label: 'Вырезы 2 кат. шт', type: 'number' },
      { name: 'cutsv3', label: 'Вырезы 3 кат. шт', type: 'number' },
      { name: 'color', label: 'Цвет', type: 'select', options: [] },
      { name: 'print', label: 'Печать, м2', type: 'number' },
      {
        name: 'shape',
        label: 'Прямоугольная форма',
        type: 'checkbox',
        defaultValue: true,
        info: 'Углы строго 90°',
      },
      { name: 'tempered', label: 'Закаленное', type: 'checkbox', defaultValue: true },
      { name: 'quantity', label: 'Количество, шт', type: 'number' },
      {
        name: 'addTape',
        label: 'Доп пленка',
        type: 'select',
        info: 'Дополнительная пленка',
        options: [],
      },
      {
        name: 'rounding',
        label: 'Округление',
        type: 'select',
        required: true,
        info: 'Правило округления размеров',
        options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'],
      },
      {
        type: 'group',
        name: 'layers',
        column: 'right',
        addLabel: 'Добавить ПФ',
        removeLabel: 'Удалить ПФ',
        // Repeatable interleaved stack: материал, пленка, материал, … , материал.
        // Starts at материал 1 / пленка 1 / материал 2. «Добавить ПФ» adds one
        // пленка + one материал; «Удалить ПФ» removes a pair but never goes below
        // `min`. Materials always = films + 1. Field names are suffixed _1, _2, …
        min: 1,
        material: { name: 'material', label: 'Материал', type: 'select', required: true, options: [] },
        film: { name: 'film', label: 'Пленка', type: 'select', options: [] },
      },
    ],
    buttons: [BTN.calculate, BTN.clear, BTN.lightning],
  },

  // Керагласс — fields to be filled in later.
  keraglass: {
    fields: [],
    buttons: [BTN.calculate, BTN.clear, BTN.lightning],
  },

  // Стеклопакет — fields to be filled in later.
  'glasspacket': {
    fields: [],
    buttons: [BTN.calculate, BTN.clear, BTN.lightning],
  },

  // Закалка — fields to be filled in later.
  tempering: {
    fields: [],
    buttons: [BTN.calculate, BTN.clear, BTN.lightning],
  },
};
