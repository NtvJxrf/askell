import React, { useContext, useMemo, useEffect } from 'react';
import { HolderOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Table, Space, InputNumber, Modal } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { setPositions } from '../../slices/positionsSlice';
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
    const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
    const [isModalVisible, setIsModalVisible] = React.useState(false);
    const [selectedRecord, setSelectedRecord] = React.useState(null);


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

    const handleDetails = (record) => {
        setSelectedRecord(record);
        setIsModalVisible(true);
    };


    const [editIndexes, setEditIndexes] = React.useState({});
    const [pagination, setPagination] = React.useState({
        current: 1,
        pageSize: 10,
    });

    const saveIndexChange = (key) => {
        const newIndex = (editIndexes[key] ?? 1) - 1;
        const currentIndex = dataSource.findIndex(item => item.key === key);
        
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < dataSource.length) {
            const newData = arrayMove(dataSource, currentIndex, newIndex);
            setDataSource(newData);
            dispatch(setPositions(newData));
        }

        setEditIndexes(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
        });
    };



    const columns = [
        { key: 'sort', align: 'center', width: 80, render: () => <DragHandle /> },
        {
            title: '№',
            key: 'index',
            align: 'center',
            render: (text, record, index) => {
                const absoluteIndex = (pagination.current - 1) * pagination.pageSize + index;
                return (
                    <InputNumber
                        min={1}
                        max={dataSource.length}
                        value={editIndexes[record.key] ?? absoluteIndex + 1}
                        onChange={(val) => {
                            setEditIndexes(prev => ({ ...prev, [record.key]: val }));
                        }}
                        onBlur={() => saveIndexChange(record.key)}
                        onPressEnter={() => saveIndexChange(record.key)}
                        style={{ width: 60 }}
                    />
                );
            }
        },
        { title: 'Название', dataIndex: 'name' },
        { title: 'Цена', dataIndex: 'price', render: (value ) => (value / 100).toFixed(2) },
        { title: 'Создано', dataIndex: 'added', render: (value) => (
            <div style={{ 
                backgroundColor: value ? 'lightgreen' : 'lightcoral', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                textAlign: 'center',
                color: value ? 'darkgreen' : 'darkred',
                fontWeight: 'bold',
                userSelect: 'none'
            }}>
            {value ? 'Да' : 'Нет'}
            </div>
        )},
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
    const detailsColumns = [
        { title: 'Название', dataIndex: 'name' },

    ]
    console.log('render positions')
    return (
        <>
            <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
                <SortableContext items={dataSource.map(i => i.key)} strategy={verticalListSortingStrategy}>
                    <Table
                        rowKey="key"
                        components={{ body: { row: Row } }}
                        columns={columns}
                        dataSource={dataSource}
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20', '50', '100', '200'],
                            position: ['topRight'],
                            onChange: (page, pageSize) => {
                                setPagination({ current: page, pageSize });
                            },
                        }}
                        rowSelection={{
                            selectedRowKeys,
                            onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
                        }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <Space size="middle">
                                    <Button danger onClick={() => handleDelete(record)}>Удалить</Button>
                                    <Button onClick={() => handleDetails(record)}>Подробнее</Button>
                                </Space>
                            )
                        }}
                        summary={pageData => {
                            let totalAmount = 0;
                            pageData.forEach(({ price, quantity }) => {
                            totalAmount += (price / 100) * quantity;
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
            <Modal
                title="Детали позиции"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                {selectedRecord && (
                    <Table dataSource={selectedRecord.details} columns={detailsColumns} pagination={false} />
                )}
            </Modal>
        </>
    );
};

export default React.memo(Positions);
