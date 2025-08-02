import React, { useContext, useMemo, useState, useEffect } from 'react';
import { HolderOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Table, Space, InputNumber } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { setPositions, setSelectedRowKeys } from '../../slices/positionsSlice';
import PositionDetailsModal from './PositionDetailsModal.jsx';
import { setFormData } from '../../slices/formSlice.js';
import { useNavigate } from 'react-router-dom'
const RowContext = React.createContext({});
const DragHandle = () => {
    const { setActivatorNodeRef, listeners } = useContext(RowContext);
    return (
        <Button
            type="text"
            size="small"
            icon={<HolderOutlined />}
            style={{ cursor: 'move' }}
            ref={setActivatorNodeRef}
            {...listeners}
        />
    );
};

const Row = ({ rowStyles = {}, ...props }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props['data-row-key'] });

    const style = {
        ...props.style,
        ...rowStyles[props['data-row-key']],
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 1000 } : {}),
    };

    const contextValue = useMemo(() => ({ setActivatorNodeRef, listeners }), [setActivatorNodeRef, listeners]);

    return (
        <RowContext.Provider value={contextValue}>
            <tr {...props} ref={setNodeRef} style={style} {...attributes} />
        </RowContext.Provider>
    );
};

const Positions = ({form}) => {
    const dispatch = useDispatch();
    const positions = useSelector(state => state.positions.positions);
    const productionLoad = useSelector(state => state.positions.productionLoad);
    const selectedRowKeys = useSelector(state => state.positions.selectedPosition);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const navigate = useNavigate()
    const rowKeyToStyle = useMemo(() => {
        const styles = {};
        positions.forEach(record => {
            const hasErrors = record?.result?.errors?.length > 0;
            const hasWarnings = record?.result?.warnings?.length > 0;
            if (hasErrors) {
                styles[record.key] = { backgroundColor: '#ffe6e6' }; // светло-красный
            } else if (hasWarnings) {
                styles[record.key] = { backgroundColor: '#fff4e5' }; // светло-оранжевый
            } else {
                styles[record.key] = {}; // прозрачный
            }
        });
        return styles;
    }, [positions]);
    useEffect( () => {
        if(!positions.length) return
        let S_all = 0, stanok = 'Криволинейка', additions = false, triplex = false
        positions.forEach(el => {
            if(!el.result) return
            S_all += el.result.other.S * el.quantity
            el.result.other.stanok === 'Прямолинейка' && (stanok = 'Прямолинейка')
            el.result.other.type === 'Триплекс' && (triplex = true)
            const {drills, cutsv1, cutsv2, cutsv3, zenk, color} = el.initialData
            if(drills || cutsv1 || cutsv2 || cutsv3 || zenk || color) additions = true
        })
        const loadBeforeThisOrder = (stanok === 'Прямолинейка' ? productionLoad.straightTotal : productionLoad.curvedTotal) / 24
        let res = 0
        if(stanok === 'Прямолинейка')
            res = loadBeforeThisOrder + Math.ceil(S_all / 80)
        else(stanok === 'Криволинейка')
            res = loadBeforeThisOrder + Math.ceil(S_all / 70)
        triplex && (res += 1 + S_all / 27)
        additions && (res += 2)
        console.log(loadBeforeThisOrder)
        console.log(additions)
        console.log(S_all)
        console.log(res)
    }, [positions])
    const onDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const oldIndex = positions.findIndex(item => item.key === active.id);
            const newIndex = positions.findIndex(item => item.key === over.id);
            const newOrder = arrayMove(positions, oldIndex, newIndex);
            dispatch(setPositions(newOrder));
        }
    };

    const handleQuantityChange = (key, quantity) => {
        dispatch(setPositions(positions.map(p => p.key === key ? { ...p, quantity } : p)));
    };

    const handleSelectionChange = (newSelectedKeys) => {
        dispatch(setSelectedRowKeys(newSelectedKeys));
    };

    const handleDelete = record => {
        const updated = positions.filter(item => item.key !== record.key);
        dispatch(setPositions(updated));
    };

    const handleDetails = record => {
        setSelectedRecord(record);
        setIsModalVisible(true);
    };
    const handleEdit = record => {
        const map = {
            'СМД': 'SMDForm',
            'Стекло': 'GlassForm',
            'Триплекс': 'TriplexForm',
            'Керагласс': 'CeraglassForm',
            'Стеклопакет': 'GlassPacketForm',
        }
        const typeMap = {
            'СМД': 'smd',
            'Стекло': 'glass',
            'Триплекс': 'triplex',
            'Керагласс': 'ceraglass',
            'Стеклопакет': 'glasspacket',
        }
        dispatch(setFormData({formType: map[record.result.other.type], values: record.initialData}))
        handleDelete(record)
        form.setFieldsValue(record.initialData)
        navigate(`/calculators/${typeMap[record.result.other.type]}`)
    }
    const columns = [
        { key: 'sort', align: 'center', width: 80, render: () => <DragHandle /> },
        { title: '№', key: 'index', align: 'center', render: (text, record) => positions.findIndex(item => item.key === record.key) + 1 },
        { title: 'Название', dataIndex: 'name', key: 'name' },
        {
            title: 'Цена',
            dataIndex: 'price',
            key: 'price',
            render: value => value.toFixed(2),
        },
        {
            title: 'Создано',
            dataIndex: 'added',
            key: 'added',
            render: value => (
                <div
                    style={{
                        backgroundColor: value ? 'lightgreen' : 'lightcoral',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        color: value ? 'darkgreen' : 'darkred',
                        fontWeight: 'bold',
                        userSelect: 'none',
                    }}
                >
                    {value ? 'Да' : 'Нет'}
                </div>
            ),
        },
        {
            title: 'Количество',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (value, record) => (
                <InputNumber min={0} value={value} onChange={val => handleQuantityChange(record.key, val)} style={{ maxWidth: 80 }} />
            ),
        },
    ];

    console.log('render positions');

    return (
        <>
            <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
                <SortableContext items={positions.map(i => i.key)} strategy={verticalListSortingStrategy}>
                    <Table
                        rowKey="key"
                        components={{
                            body: {
                                row: (props) => <Row {...props} rowStyles={rowKeyToStyle} />
                            }
                        }}
                        columns={columns}
                        dataSource={positions}
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20', '50', '100', '200'],
                            position: ['topRight'],
                            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
                        }}
                        rowSelection={{ selectedRowKeys, onChange: handleSelectionChange }}
                        expandable={{
                            expandedRowRender: record => (
                                <Space size="middle">
                                    <Button danger onClick={() => handleDelete(record)}>Удалить</Button>
                                    <Button onClick={() => handleDetails(record)}>Подробнее</Button>
                                    <Button onClick={() => handleEdit(record)}>Редактировать</Button>
                                </Space>
                            ),
                        }}
                        summary={pageData => {
                            let totalAmount = 0;
                            pageData.forEach(({ price, quantity }) => {
                                totalAmount += price * quantity;
                            });

                            return (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell>Итого</Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        <b>{totalAmount.toFixed(2)}</b>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            );
                        }}
                    />
                </SortableContext>
            </DndContext>

            <PositionDetailsModal open={isModalVisible} onClose={() => setIsModalVisible(false)} record={selectedRecord} />
        </>
    );
};

export default React.memo(Positions);
