import React, { useContext, useMemo, useEffect } from 'react';
import { HolderOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Table, Space, InputNumber } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { setPositions } from '../slices/positionsSlice';

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

const Row = props => {
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
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
    };

    const contextValue = useMemo(() => ({ setActivatorNodeRef, listeners }), [setActivatorNodeRef, listeners]);

    return (
        <RowContext.Provider value={contextValue}>
            <tr {...props} ref={setNodeRef} style={style} {...attributes} />
        </RowContext.Provider>
    );
};

const Positions = () => {
    const dispatch = useDispatch();
    const initialData = useSelector(state => state.positions.positions);
    const [dataSource, setDataSource] = React.useState(initialData);

    useEffect(() => {
        setDataSource(initialData);
    }, [initialData]);

    const onDragEnd = ({ active, over }) => {
        if (active.id !== (over?.id)) {
            setDataSource(prevState => {
                const activeIndex = prevState.findIndex(record => record.key === active.id);
                const overIndex = prevState.findIndex(record => record.key === over.id);
                const newOrder = arrayMove(prevState, activeIndex, overIndex);

                dispatch(setPositions(newOrder));
                return newOrder;
            });
        }
    };

    const handleQuantityChange = (key, newQuantity) => {
        const newData = dataSource.map(item => {
            if (item.key === key) {
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        setDataSource(newData);
        dispatch(setPositions(newData));
    };

    const handleDelete = (key) => {
        const newData = dataSource.filter(item => item.key !== key);
        setDataSource(newData);
        dispatch(setPositions(newData));
    };

    const handleSave = (key) => {
        const item = dataSource.find(item => item.key === key);
        console.log('Сохраняем элемент', item)
        
    };

    const handleDetails = (key) => {
        console.log('Показать детали для', key)

    };

    const columns = [
        { key: 'sort', align: 'center', width: 80, render: () => <DragHandle /> },
        { title: 'Название', dataIndex: 'name' },
        { title: 'Цена', dataIndex: 'price' },
        { title: 'Создано', dataIndex: 'added', render: (value) => (value ? 'Да' : 'Нет') },
        {
            title: 'Количество',
            dataIndex: 'quantity',
            render: (value, record) => (
                <InputNumber
                    min={0}
                    value={value}
                    onChange={(val) => handleQuantityChange(record.key, val)}
                    style={{ width: 80 }}
                />
            ),
        },
    ];
    console.log('render positions')
    return (
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
            <SortableContext items={dataSource.map(i => i.key)} strategy={verticalListSortingStrategy}>
                <Table
                    rowKey="key"
                    components={{ body: { row: Row } }}
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    expandable={{
                        expandedRowRender: (record) => (
                            <Space size="middle">
                                <Button danger onClick={() => handleDelete(record.key)}>Удалить</Button>
                                <Button onClick={() => handleSave(record.key)}>Сохранить</Button>
                                <Button onClick={() => handleDetails(record.key)}>Подробнее</Button>
                            </Space>
                        )
                    }}
                />
            </SortableContext>
        </DndContext>
    );
};

export default React.memo(Positions);
