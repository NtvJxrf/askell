import { List, Button, Space, Typography, message, Divider } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import axios from "axios";
import Init from "../../init";
import { useState } from "react";
const { Text, Title } = Typography;

const Settings = () => {
    const selfcost = useSelector((state) => state.selfcost.selfcost);
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch();
    if (!selfcost) return <div>Загрузка...</div>;

    const updatedData = Object.entries(selfcost.updates).map(([key, timestamp]) => {
        const isValidTimestamp = typeof timestamp === "number" && timestamp > 0;
        const date = isValidTimestamp ? new Date(timestamp).toLocaleString() : null;

        return {
          key,
          label: key,
          updated: date,
        };
    });

    const handleUpdateAll = async () => {
      setLoading(true)
      try{
          const result = await axios.post(`${import.meta.env.VITE_API_URL}/api/sklad/updateSelfcosts`, {}, { withCredentials: true });
          await Init.getSelfcost(dispatch)
          messageApi.success("Обновлено");
      }catch(e){
      messageApi.error("Ошибка при обновлении: " + e.message);
      }finally{
        setLoading(false)
      }
    };

  return (
    <div style={{ padding: "24px" }}>
      {contextHolder}
      <Title level={3}>Настройки калькулятора</Title>
      <Text type="secondary">
        Актуальность данных себестоимости
      </Text>

      <Divider />

      <List
        dataSource={updatedData}
        renderItem={({ key, label, updated }) => (
          <List.Item key={key} style={{ paddingLeft: 0 }}>
            <Space direction="vertical">
              <Text strong>{label}</Text>
              {updated ? (
                <Text type="secondary">Обновлено: {updated}</Text>
              ) : (
                <Text type="warning">Не обновлено</Text>
              )}
            </Space>
          </List.Item>
        )}
      />

      <Divider />

      <Button type="primary" shape="round" icon={<ReloadOutlined />} onClick={handleUpdateAll} disabled={loading}>
        Обновить всё
      </Button>
    </div>
  );
};

export default Settings;
