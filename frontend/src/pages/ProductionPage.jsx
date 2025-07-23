import React, { useEffect, useState } from "react";
import { Tabs, Table, Spin, Typography, Space } from "antd";
import axios from "axios";

const { Title, Text } = Typography;

const OrdersInWorkTables = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const columns = [
    {
      title: "Дата",
      dataIndex: "created",
      key: "created",
    },
    {
      title: "Название заказа",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Позиция",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "Станок",
      dataIndex: "stanok",
      key: "stanok",
    },
    {
      title: "Время (ч)",
      dataIndex: "productionTime",
      key: "productionTime",
      render: (val) => val?.toFixed(2),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/ordersInWork`, {
          withCredentials: true,
        });
        setData(
          res.data || { kriv: [], pryam: [], other: [], krivo: 0, pryamo: 0 }
        );
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
            rowKey={(record) => `${record.name}-${record.position}-${record.created}`}
            pagination={{ pageSize: 50 }}
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
            rowKey={(record) => `${record.name}-${record.position}-${record.created}`}
            pagination={{ pageSize: 50 }}
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
            rowKey={(record) => `${record.name}-${record.position}-${record.created}`}
            pagination={{ pageSize: 50 }}
          />
        ),
      },
    ];
  };

  return (
    <div>
      <Space direction="vertical" style={{ marginBottom: 24 }}>
        <Title level={4}>Загрузка станков</Title>
        <Text>Криволинейка: <strong>{(data?.krivo ?? 0).toFixed(2)} ч</strong></Text>
        <Text>Прямолинейка: <strong>{(data?.pryamo ?? 0).toFixed(2)} ч</strong></Text>
      </Space>

      <Tabs items={getItems()} defaultActiveKey="kriv" centered />
    </div>
  );
};

export default OrdersInWorkTables;
