import React, { useState } from "react";
import { Tabs, Table, Tooltip, Typography, Row, Col, Card, Descriptions, Progress } from "antd";
import { useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

const { Title, Text } = Typography;

const OrdersInWorkTables = () => {
  const data = useSelector(state => state.positions.productionLoad);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const columns = [
    { title: "Дата", dataIndex: "created", key: "created", fixed: "left" },
    { title: "Номер", dataIndex: "name", key: "name", fixed: "left" },
    { title: "План. дата отгрузки", dataIndex: "deliveryPlannedMoment", key: "deliveryPlannedMoment" },
    { title: "Позиция", dataIndex: "position", key: "position",
      render: (text) => (
        <Tooltip title={text} popupStyle={{ maxWidth: 600, whiteSpace: 'normal' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              cursor: 'pointer',
              textDecoration: 'underline dotted',
            }}
          >
            {text}
          </div>
        </Tooltip>
      ),
    },
    { title: "Кол-во", dataIndex: "quantity", key: "quantity" },
  ];

  const getItems = () => {
    const kriv = data?.curvedArr ?? [];
    const pryam = data?.straightArr ?? [];
    const other = data?.otherArr ?? [];

    return [
      {
        key: "kriv",
        label: `Криволинейка (${kriv.length} поз.)`,
        children: (
          <Table
            dataSource={kriv}
            columns={columns}
            rowKey={(record) => `${record.id}`}
            pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50', '100', '200'],
                position: ['topRight'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            scroll={{ x: 'max-content' }}
          />
        ),
      },
      {
        key: "pryam",
        label: `Прямолинейка (${pryam.length} поз.)`,
        children: (
          <Table
            dataSource={pryam}
            columns={columns}
            rowKey={(record) => `${record.id}`}
            pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50', '100', '200'],
                position: ['topRight'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            scroll={{ x: 'max-content' }}
          />
        ),
      },
      {
        key: "other",
        label: `Прочее (${other.length} поз.)`,
        children: (
          <Table
            dataSource={other}
            columns={columns}
            rowKey={(record) => `${record.id}`}
            pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50', '100', '200'],
                position: ['topRight'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            scroll={{ x: 'max-content' }}
          />
        ),
      },
    ];
  };

  const MachineCard = React.memo(({ title, load, total }) => { 
    const chartData = [
      { name: "Пог. м", value: total?.P.toFixed(2) ?? 0 },
      { name: "м²", value: total?.S.toFixed(2) ?? 0 },
    ];

    return (
      <Card title={title}>
        {/* Загрузка в процентах */}
        <Progress
          percent={Math.min((load / 10) * 100, 100)}
          format={() => `${load?.toFixed(2) || 0} раб. дней`}
          strokeColor={load > 15 ? "red" : load > 10 ? "orange" : "green"}
        />

        {/* BarChart */}
        <div style={{ height: 150, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#1890ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Цифры */}
        <Descriptions column={1} size="small" colon={false} style={{ marginTop: 16 }}>
          <Descriptions.Item label="Позиций">{(total?.positionsCount ?? 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Штук">{(total?.count ?? 0).toFixed(2)}</Descriptions.Item>
        </Descriptions>
      </Card>
    );
  })
  const MachineCards = React.memo(({ data }) => (
  <Row gutter={16}>
    <Col span={12}>
      <MachineCard title="Криволинейка" load={data?.curvedLoad} total={data?.total?.Криволинейка} />
    </Col>
    <Col span={12}>
      <MachineCard title="Прямолинейка" load={data?.straightLoad} total={data?.total?.Прямолинейка} />
    </Col>
  </Row>
));
  return (
    <div>
      <MachineCards data={data} />
      <Tabs items={getItems()} defaultActiveKey="kriv" centered />
    </div>
  );
};

export default OrdersInWorkTables;
