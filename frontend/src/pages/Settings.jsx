import { List, Button, Space, Typography, message, Divider } from "antd";
import { ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Init from "../init";
import { useState } from "react";

const { Text, Title } = Typography;

const updateKeys = [
  { label: "Материалы", key: "materials" },
  { label: "Упаковочные материалы", key: "packaging" },
  { label: "Этапы", key: "processingStages" },
  { label: "Склады", key: "stores" },
  { label: "Подстолья", key: "unders" },
  { label: "Цвета", key: "colors" },
  { label: "Цены и коэффиценты", key: "pricing" },
  { label: "Атрибуты", key: "attributes" },
  { label: "Техкарты для смд", key: "smdPlans" },
  { label: "Валюты", key: "currencies" },
  { label: "Типы цен", key: "priceTypes" },
  { label: "Сотрудники", key: "employees" },
];

const Settings = () => {
  const selfcost = useSelector((state) => state.selfcost.selfcost);
  const updates = selfcost?.updates ?? {};
  const [messageApi, contextHolder] = message.useMessage();
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState({});
  const dispatch = useDispatch();

  if (!selfcost) return <div>Загрузка...</div>;

  const updatedData = updateKeys.map(({ label, key }) => {
    const updateObj = updates[label];
    const timestamp = updateObj?.date;
    const date =
      typeof timestamp === "number" && timestamp > 0
        ? new Date(timestamp).toLocaleString()
        : null;

    return { label, apiKey: key, updated: date,};
  });

  const handleUpdateAll = async () => {
    setLoadingGlobal(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/sklad/updateSelfcosts`, {}, { withCredentials: true });
      await Init.getSelfcost(dispatch);
      messageApi.success("Обновлено");
    } catch (e) {
      console.error(e);
      messageApi.error(e?.response?.data?.message || "Ошибка при обновлении");
    } finally {
      setLoadingGlobal(false);
    }
  };

  const handleUpdateOne = async (apiKey) => {
    setLoadingKeys((prev) => ({ ...prev, [apiKey]: true }));
    try {
      await axios.post( `${import.meta.env.VITE_API_URL}/api/sklad/updateSelfcosts/${encodeURIComponent(apiKey)}`, {}, { withCredentials: true } );
      await Init.getSelfcost(dispatch);
      messageApi.success("Обновлено: " + apiKey);
    } catch (e) {
      console.error(e);
      messageApi.error(
        e?.response?.data?.message || `Ошибка при обновлении ${apiKey}`
      );
    } finally {
      setLoadingKeys((prev) => ({ ...prev, [apiKey]: false }));
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      {contextHolder}
      <Title level={3}>Настройки калькулятора</Title>
      <Text type="secondary">Актуальность данных себестоимости</Text>

      <Divider />

      <List
        dataSource={updatedData}
        renderItem={({ label, updated, apiKey }) => (
          <List.Item key={apiKey} style={{ paddingLeft: 0 }}>
            <Space direction="vertical" style={{ flex: 1 }}>
              <Text strong>{label}</Text>
              {updated ? (
                <Text type="secondary">Обновлено: {updated}</Text>
              ) : (
                <Text type="warning">Не обновлено</Text>
              )}
            </Space>
            <Button
              type="default"
              loading={loadingKeys[apiKey]}
              onClick={() => handleUpdateOne(apiKey)}
              size="small"
              icon={<SyncOutlined />}
            >
              Обновить
            </Button>
          </List.Item>
        )}
      />

      <Divider />

      <Button
        type="primary"
        shape="round"
        icon={<ReloadOutlined />}
        onClick={handleUpdateAll}
        disabled={loadingGlobal}
      >
        Обновить всё
      </Button>
    </div>
  );
};

export default Settings;
