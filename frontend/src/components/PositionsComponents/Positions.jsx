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
import { Button, Table, Space, InputNumber, Alert } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { setPositions, setSelectedRowKeys, setPositionAtIndex, setPlanDate } from '../../slices/positionsSlice';
import PositionDetailsModal from './PositionDetailsModal.jsx';
import EditPositionModal from './EditPositionModal.jsx';
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
const QuantityCell = ({ value, record, onChange }) => {
    const [localVal, setLocalVal] = useState(value);

    useEffect(() => {
        setLocalVal(value); // синхронизировать если стор обновился
    }, [value]);

    return (
        <InputNumber
            min={1}
            value={localVal}
            onChange={val => setLocalVal(val)}
            onBlur={() => onChange(record.key, localVal)}
            style={{ maxWidth: 80 }}
        />
    );
};
const Positions = ({form}) => {
    const dispatch = useDispatch();
    const positions = useSelector(state => state.positions.positions);
    const productionLoad = useSelector(state => state.positions.productionLoad);
    const selectedRowKeys = useSelector(state => state.positions.selectedPosition);
    const priceType = useSelector(state => state.positions.displayPrice)
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [orderLoad, setOrderLoad] = useState(0);

    const [editModalVisible, setEditModalVisible] = useState(false);

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
        let S_all = 0, P_all = 0, stanok = 'Прямолинейка', additions = false, triplex = false, print = false, totalCutsv1 = 0, totalCutsv2 = 0, totalCutsv3 = 0
        positions.forEach(el => {
            if(!el.result || el.result.other.type === 'СМД' || el.result.other.type === 'Керагласс' || el.result.other.type === 'Стеклопакет') return
            S_all += el.result.other.S * el.quantity
            P_all += el.result.other.P * el.quantity
            el.result.other.stanok === 'Криволинейка' && (stanok = 'Криволинейка')
            el.result.other.type === 'Триплекс' && (triplex = true)
            el.initialData.print && (print = true)
            const {drills, cutsv1, cutsv2, cutsv3, zenk, color} = el.initialData
            cutsv1 && (totalCutsv1 += cutsv1 * el.quantity)
            cutsv2 && (totalCutsv2 += cutsv2 * el.quantity)
            cutsv3 && (totalCutsv3 += cutsv3 * el.quantity)
            if(drills || cutsv1 || cutsv2 || cutsv3 || zenk || color) additions = true
        })
        let loadBeforeThisOrder = (stanok === 'Прямолинейка' ? productionLoad.straightResult : productionLoad.curvedResult) || 0
        if(triplex)
            loadBeforeThisOrder = Math.max(loadBeforeThisOrder, productionLoad.triplexResult)
        let res = 0
        if(stanok === 'Прямолинейка')
            res = loadBeforeThisOrder + Math.ceil(P_all / (8 * 30))
        else if(stanok === 'Криволинейка')
            res = loadBeforeThisOrder + Math.ceil((P_all / 14 + totalCutsv1 / 8 + totalCutsv2 / 4 + totalCutsv3 / 2 + positions.length * 0.166) / (12 * 1.25))
        triplex && (res += 1 + Math.ceil(S_all / 27))
        additions && (res += 1)
        print && (res += 7)
        console.log(res)
        setOrderLoad(res || 0)
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
        setSelectedRecord(record);
        setEditModalVisible(true)
    }
    const handleSubmitEditing = (result) => {
        const index = positions.findIndex(item => item.key === selectedRecord.key)
        dispatch(setPositionAtIndex({index, data: result}))
        setEditModalVisible(false)
    }
    const columns = [
        { key: 'sort', align: 'center', width: 80, render: () => <DragHandle /> },
        { title: '№', key: 'index', align: 'center', render: (text, record) => positions.findIndex(item => item.key === record.key) + 1 },
        { title: 'Название', dataIndex: 'name', key: 'name' },
        {
            title: 'Цена',
            dataIndex: 'prices',
            key: 'prices',
            render: value => {
                const num = value?.[priceType];
                return isNaN(num) ? 0 : num.toFixed(2);
            },
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
                <QuantityCell value={value} record={record} onChange={handleQuantityChange} />
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
                        title={() => {
                            let totalGost = 0, totalRetail = 0, totalBulk = 0, totalDealer = 0, totalVip = 0
                            let totalS = 0
                            let totalP = 0
                            let kr = false, pr = false
                            positions.forEach(({ prices, quantity, result, position}) => {
                                result?.other?.stanok 
                                ? (result.other.stanok === 'Прямолинейка' ? (pr = true) : (kr = true))
                                : null;
                                totalGost += (prices['gostPrice'] || 0) * quantity;
                                totalRetail += (prices['retailPrice'] || 0) * quantity;
                                totalBulk += (prices['bulkPrice'] || 0) * quantity;
                                totalDealer += (prices['dealerPrice'] || 0) * quantity;
                                totalVip += (prices['vipPrice'] || 0) * quantity;
                                totalS += (result?.other?.S || position?.assortment?.volume || 0) * quantity
                                totalP += (result?.other?.P || position?.assortment?.attributes?.find(el => el.name == 'Периметр 1 детали в пог. м')?.value || 0) * quantity
                            });
                            const calendarDays = orderLoad;

                            const workDays = Math.ceil(calendarDays * 5 / 7);

                            const endDate = new Date();
                            endDate.setDate(endDate.getDate() + calendarDays);
                            const dayOfWeek = endDate.getDay();
                            if (dayOfWeek === 6) {
                                endDate.setDate(endDate.getDate() + 2);
                            } else if (dayOfWeek === 0) {
                                endDate.setDate(endDate.getDate() + 1);
                            }
                            const apiDate = formatDate(endDate);
                            const formattedDate = endDate.toLocaleDateString();
                            dispatch(setPlanDate({apiDate, strDays: `${workDays}-${workDays + 3}`}))
                            return (
                                <>  
                                    {(kr && pr) && (
                                        <Alert
                                            message="В заказе 2 вида обработки"
                                            type="warning"
                                            showIcon
                                            style={{ marginBottom: 12 }}
                                        />
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '16px',
                                        padding: '8px 16px',
                                        fontWeight: 'bold',
                                        background: '#fafafa',
                                        borderBottom: '1px solid #eee',
                                        borderRadius: '8px',
                                        flexWrap: 'wrap'
                                    }}>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span>Итого:</span>
                                            <span>Выше госта: {totalGost.toFixed(2)}</span>
                                            <span>Розница: {totalRetail.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span>Опт: {totalBulk.toFixed(2)}</span>
                                            <span>Дилер: {totalDealer.toFixed(2)}</span>
                                            <span>ВИП: {totalVip.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span>Срок (календарные): {calendarDays}</span>
                                            <span>Срок (рабочие): {workDays}</span>
                                            <span>~Дата готовности: {formattedDate}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span>В заказе {totalS.toFixed(2)} м²</span>
                                            <span>В заказе {totalP.toFixed(2)} м.п</span>
                                        </div>
                                    </div>
                                </>
                            );
                        }}
                    />
                </SortableContext>
            </DndContext>
            <EditPositionModal open={editModalVisible} onClose={() => setEditModalVisible(false)} record={selectedRecord} onSubmit={handleSubmitEditing}/>
            <PositionDetailsModal open={isModalVisible} onClose={() => setIsModalVisible(false)} record={selectedRecord} />
        </>
    );
};
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
export default React.memo(Positions);
