// components/PositionDetailsModal.js
import React from 'react';
import { Modal, Table } from 'antd';
import triplexCalc from '../CalcComponents/calculators/triplexCalc';

const detailsColumns = [
    { title: 'Название', dataIndex: 'name' },
    { title: 'Себестоимость', dataIndex: 'cost', render: value => value.toFixed(2) },
    { title: 'Количество', dataIndex: 'count', render: value => value.toFixed(2) },
    {
        title: 'Сумма',
        dataIndex: 'price',
        render: (_, record) => (record.cost * record.count).toFixed(2),
    },
];

const renderDetails = record => {
    if (record.result) {
        return (
            <>
                <Table
                    dataSource={record.result.materials}
                    columns={detailsColumns}
                    pagination={false}
                    rowKey={(row, index) => `mat-${index}`}
                />
                <Table
                    dataSource={record.result.works}
                    columns={detailsColumns}
                    pagination={false}
                    rowKey={(row, index) => `work-${index}`}
                />
            </>
        );
    } else if (record.details) {
        const result = triplexCalc(record.details.initialData, record.details.selfcost)
        return (
            <>
                <Table
                    dataSource={result.result.materials}
                    columns={detailsColumns}
                    pagination={false}
                    rowKey={(row, index) => `mat-${index}`}
                />
                <Table
                    dataSource={result.result.works}
                    columns={detailsColumns}
                    pagination={false}
                    rowKey={(row, index) => `work-${index}`}
                />
            </>
        );
    } else {
        return <p>Никаких деталей нет</p>;
    }
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

export default React.memo(PositionDetailsModal);
