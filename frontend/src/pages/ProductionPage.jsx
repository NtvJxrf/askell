import React, { useEffect, useState } from "react";
import { Tabs, Table, Spin, Typography, Space, Tooltip } from "antd";
import axios from "axios";

const { Title, Text } = Typography;

const OrdersInWorkTables = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const columns = [
    { title: "Дата", dataIndex: "created", key: "created", fixed: "left", },
    { title: "Номер", dataIndex: "name", key: "name", fixed: "left", },
    { title: "План. дата отгрузки", dataIndex: "deliveryPlannedMoment", key: "deliveryPlannedMoment",},
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
    {
      title: "Прямолинейка (ч)",
      dataIndex: "thisStraight",
      key: "thisStraight",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Криволинейка (ч)",
      dataIndex: "thisCurved",
      key: "thisCurved",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Сверловка (ч)",
      dataIndex: "thisDrills",
      key: "thisDrills",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Раскрой (ч)",
      dataIndex: "thisCutting",
      key: "thisCutting",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Закалка (ч)",
      dataIndex: "thisTempering",
      key: "thisTempering",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Триплекс (ч)",
      dataIndex: "thisTriplex",
      key: "thisTriplex",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Селькоровская (ч)",
      dataIndex: "thisSelk",
      key: "thisSelk",
      fixed: "right",
      render: (val) => val?.toFixed(2),
    },
    {
      title: "Виз (ч)",
      dataIndex: "thisViz",
      key: "thisViz",
      fixed: "right",
      render: (val) => val?.toFixed(2),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/ordersInWork`, { withCredentials: true });
        setData(res.data || { kriv: [], pryam: [], other: [], krivo: 0, pryamo: 0 });
      } catch (err) {
        console.error("Ошибка при загрузке данных:", err);
        setData({ kriv: [], pryam: [], other: [], krivo: 0, pryamo: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "2rem auto" }} />;

  const getItems = () => {
    const kriv = data?.kriv ?? [];
    const pryam = data?.pryam ?? [];
    const other = data?.other ?? [];

    return [
      {
        key: "kriv",
        label: `Криволинейка (${kriv.length} поз.)`,
        children: (
          <Table
            dataSource={kriv}
            columns={columns}
            rowKey={(record) => `${record.id}`}
            pagination={{ pageSize: 50 }}
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
            rowKey={(record) => `${record.name}`}
            pagination={{ pageSize: 50 }}
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
            rowKey={(record) => `${record.name}`}
            pagination={{ pageSize: 50 }}
            scroll={{ x: 'max-content' }}
          />
        ),
      },
    ];
  };

  return (
    <div>
      <Space direction="vertical" style={{ marginBottom: 24 }}>
        <Title level={4}>Загрузка станков</Title>
        <Text>Криволинейка: <strong>{(data?.curvedTotal ?? 0).toFixed(2)} ч</strong></Text>
        <Text>Прямолинейка: <strong>{(data?.straightTotal ?? 0).toFixed(2)} ч</strong></Text>
        <Text>Сверловка: <strong>{(data?.drillsTotal ?? 0).toFixed(2)} ч</strong></Text>
        <Text>Раскрой: <strong>{(data?.cuttingTotal ?? 0).toFixed(2)} ч</strong></Text>
        <Text>Закалка: <strong>{(data?.temperingTotal ?? 0).toFixed(2)} ч</strong></Text>
        <Text>Триплекс: <strong>{(data?.triplexTotal ?? 0).toFixed(2)} ч</strong></Text>
      </Space>

      <Tabs items={getItems()} defaultActiveKey="kriv" centered />
    </div>
  );
};

export default OrdersInWorkTables;
