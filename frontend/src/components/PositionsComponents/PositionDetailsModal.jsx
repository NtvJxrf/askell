// components/PositionDetailsModal.js
import React from 'react';
import { Modal, Tooltip, Typography, Divider } from 'antd';

const { Text, Title } = Typography;

const renderItem = (item, index) => {
    const hasDetails = item.string || item.formula;
    const formattedValue = item?.value?.toFixed(2)
    return (
        <div key={index} style={{ marginBottom: 4 }}>
            <Text>
                {item.name}:{' '}
                {hasDetails ? (
                    <Tooltip
                        title={
                            <>
                                {item.formula && (
                                    <div><strong>Формула:</strong> {item.formula}</div>
                                )}
                                {item.string && (
                                    <div><strong>Пояснение:</strong> {item.string}</div>
                                )}
                            </>
                        }
                        placement="right"
                        popupStyle={{ maxWidth: 600, whiteSpace: 'normal' }}
                    >
                        <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>
                            {formattedValue}
                        </span>
                    </Tooltip>
                ) : (
                    <strong>{formattedValue}</strong>
                )}
            </Text>
        </div>
    );
};


const renderDetails = (record) => {
    const { result } = record || {};
    if (!result) return null;
    const { materials = [], works = [], expenses = {}, finalPrice = {}} = result;

    const totalMaterials = materials.reduce((sum, item) => sum + (item.value || 0), 0)
    const totalWorks = works.reduce((sum, item) => sum + (item.value || 0), 0)
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.value || 0), 0)
    return (
        <div style={{ display: 'flex', gap: 32 }}>
            {/* Левая колонка — расчеты */}
            <div style={{ flex: 2 }}>
                <Title level={4}>Материалы</Title>
                {materials.map(renderItem)}
                <div style={{ marginTop: 8, fontWeight: 'bold' }}>
                    Итого по материалам: {totalMaterials.toFixed(2)}
                </div>

                <Divider />

                <Title level={4}>Работы</Title>
                {works.map(renderItem)}
                <div style={{ marginTop: 8, fontWeight: 'bold' }}>
                    Итого по работам: {totalWorks.toFixed(2)}
                </div>

                <Divider />

                <Title level={4}>Расходы</Title>
                {expenses.map(renderItem)}
                <div style={{ marginTop: 8, fontWeight: 'bold' }}>
                    Итого по доп расходам: {totalExpenses.toFixed(2)}
                </div>

                <Divider />

                <Title level={4}>Цена</Title>
                {renderItem(finalPrice)}
            </div>

            {/* Правая колонка — исходные данные */}
            <div style={{ flex: 1 }}>
                {renderLabeledDataBlock('Исходные данные', record.initialData, initialDataLabels)}
                {renderLabeledDataBlock('Доп информация', result.other, otherLabels)}
            </div>
        </div>
    );

};



const PositionDetailsModal = ({ open, onClose, record }) => {
    return (
        <Modal
            title="Детали позиции"
            open={open}
            onCancel={onClose}
            footer={null}
            style={{ minWidth: 800 }}
        >
            {record && renderDetails(record)}
        </Modal>
    );
};

const renderLabeledDataBlock = (title, data, dictionary = {}) => {
    if (!data || typeof data !== 'object') return null
    return (
        <>
            <Title level={5}>{title}</Title>
            {Object.entries(data).map(([key, value]) => {
                if(ignorLabels.includes(key)) return
                let label = dictionary[key] || key;
                for (const { regex, label: prefix } of labelPrefixes) {
                    const match = key.match(regex);
                    if (match) {
                        label = `${prefix} ${match[1]}`;
                        break;
                    }
                }
                const displayValue =
                    typeof value === 'boolean'
                        ? value ? 'Да' : 'Нет'
                        : typeof value === 'number'
                            ? value.toFixed(2)
                            : String(value || '');

                return (
                    <div key={key}>
                        <Text type="secondary">{label}:</Text> {displayValue}
                    </div>
                );
            })}
            <Divider />
        </>
    );
};

const ignorLabels = ['ignor', 'calcType', 'productType']
const initialDataLabels = {
    height: 'Высота',
    width: 'Ширина',
    drills: 'Сверление',
    zenk: 'Зенковка',
    cutsv1: 'Вырез 1 кат.',
    cutsv2: 'Вырез 2 кат.',
    cutsv3: 'Вырез 3 кат.',
    shape: 'Прямоугольная форма',
    tempered: 'Закалка',
    polishing: 'Полировка',
    print: 'Печать',
    addTape: 'Дополнительная плёнка',
    rounding: 'Округление',
    customertype: 'Тип клиента',
    trim: 'Коэфицент обрези',
    color: 'Цвет',
    material: 'Материал',
    cuts: `Вырезы`,
    type: 'Тип',
    clientType: 'Тип клиента(Для СМД)',
    rounds: 'Скругления',
    drillssmd: 'Сверление СМД',
    gas: 'Газ',
};

const labelPrefixes = [
  { regex: /^material(\d+)$/, label: 'Материал' },
  { regex: /^tape(\d+)$/, label: 'Плёнка' },
  { regex: /^plane(\d+)$/, label: 'Рамка' },
  { regex: /^tempered(\d+)$/, label: 'Закаленное' },
  { regex: /^polishing(\d+)$/, label: 'Полировка' },
  { regex: /^blunting(\d+)$/, label: 'Притупка' }
];

const otherLabels = {
    P: 'Периметр',
    S: 'Площадь изделия',
    S_tape: 'Площадь пленки',
    trim: 'Коэфицент обрези',
    stanok: 'Станок',
    allThickness: 'Общая толщина триплекса, мм',
    weight: 'Вес, кг',
    type: 'Тип изделия',
    viz: 'Учавствует виз',
};

export default React.memo(PositionDetailsModal);
