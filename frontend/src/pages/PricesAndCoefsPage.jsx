// src/pages/PricesAndCoefsPage.jsx

import { useEffect, useState } from 'react';
import {
  Table,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Card,
  Popconfirm,
  Typography,
  message,
  Tabs,
  Upload,
} from 'antd';
import { SearchOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { tabConfigs } from '../constants/tabConfig.js';
import Init from '../init.js';
import { useDispatch } from "react-redux";
import * as XLSX from 'xlsx';

const { Title, Paragraph } = Typography;
const PricesAndCoefsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [dataMap, setDataMap] = useState({});
  const [activeTab, setActiveTab] = useState(tabConfigs[0].key);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [disabled, setDisabled] = useState(false)
  const getTabConfig = (key) => tabConfigs.find(t => t.key === key);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/getAll`, { withCredentials: true });

        const formatted = {};
        for (const tab of tabConfigs) {
          const list = response.data[tab.key] || [];
          formatted[tab.key] = list.map(item => ({
            key: item.id || item.name,
            ...item,
          }));
        }
        setDataMap(formatted);
      } catch (err) {
        messageApi.error(err.response?.data?.message || 'Ошибка при загрузке данных');
      }
    };

    fetchData();

    return () => {
      Init.getSelfcost(dispatch);
    };
  }, [messageApi, dispatch]);

  const handleInputChange = (rowKey, field, value) => {
    setDataMap(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(item =>
        item.key === rowKey ? { ...item, [field]: value } : item
      ),
    }));
  };

  const save = async (record) => {
    try {
      const payload = {
        ...record,
        type: activeTab,
      }
      await axios.post(`${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/update`, payload, { withCredentials: true })
      messageApi.success('Сохранено');
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const remove = async (record) => {
    try {
      const payload = {
        ...record,
        type: activeTab,
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/delete`, payload, { withCredentials: true })
      setDataMap(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(i => i.key !== record.key),
      }))
      messageApi.success('Удалено')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Ошибка при удалении')
    }
  };

  const onAdd = async (values) => {
    try {
      const payload = {
        ...values,
        type: activeTab,
      };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/create`, payload, { withCredentials: true })
      const newItem = {
        key: res.data.id || Date.now().toString(),
        ...values,
      }

      setDataMap(prev => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] || []), newItem],
      }));

      form.resetFields();
      messageApi.success('Добавлено');
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Ошибка при добавлении');
    }
  };

  const getColumnSearchProps = dataIndex => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Поиск по ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
  });

  const getColumns = () => {
    const tab = getTabConfig(activeTab);
    const searchProps = field => ['name', 'description'].includes(field) ? getColumnSearchProps(field) : {};

    return [
      ...tab.fields.map(field => ({
        title: tab.columns.find(c => c.dataIndex === field)?.title || field,
        dataIndex: field,
        width: 150,
        render: (text, record) => {
          if (field === 'name') return text;

          if (typeof record[field] === 'number')
            return (<InputNumber min={0} step={0.1}value={record[field]} style={{ width: 120 }} onChange={val => handleInputChange(record.key, field, val)} />)

          return <Input value={record[field]} onChange={e => handleInputChange(record.key, field, e.target.value)} />
         
        },
        ...searchProps(field),
      })),
      {
        title: 'Действия',
        width: 100,
        render: (_, record) => (
          <Space>
            <Button type="link" onClick={() => save(record)}>Сохранить</Button>
            <Popconfirm title="Удалить?" onConfirm={() => remove(record)}>
              <Button type="link" danger>Удалить</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  };
  const handleLoadXlsm = async (data) => {
    setDisabled(true)
    try{
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/bulk`, data, { withCredentials: true })
      messageApi.success('Добавлено')
    }catch(err){
      messageApi.error(err.response?.data?.message || 'Ошибка при добавлении');
    }finally{
      setDisabled(false)
    }
  }
  return (
    <>
      {contextHolder}
      <Typography style={{ maxWidth: 1200, margin: '20px auto' }}>
        <Title level={4} style={{ textAlign: 'center' }}>Цены и коэффициенты</Title>
        <Paragraph>На этой странице вы можете управлять значениями для расчётов.</Paragraph>
      </Typography>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <Upload
          accept=".xlsx, .xls, .xlsm"
          showUploadList={false}
          beforeUpload={(file) => {
              setDisabled(true)
              const reader = new FileReader();
              reader.onload = (evt) => {
                  const data = evt.target.result;
                  const workbook = XLSX.read(data, { type: 'binary' });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  const array = XLSX.utils.sheet_to_json(sheet);
                  if (!array.length) {
                      messageApi.error('Файл пустой или невалидный');
                      return;
                  }
                  array.shift()
                  handleLoadXlsm(array)
              };
              reader.readAsArrayBuffer(file);
              setDisabled(false)
              return false
          }}
          disabled={disabled}
      >
        <Button icon={<UploadOutlined />} shape="round">Загрузить из xlsx</Button>
      </Upload>
      </div>

      <Card style={{ maxWidth: 1500, margin: '40px auto', minWidth: 1200 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          style={{ marginBottom: 24 }}
          items={tabConfigs.map(tab => ({
            label: tab.title,
            key: tab.key,
          }))}
        />

        <Form
          form={form}
          layout="inline"
          onFinish={onAdd}
          autoComplete="off"
          style={{
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          {getTabConfig(activeTab).fields.map(field => (
            <Form.Item key={field} name={field} rules={field === 'name' ? [{ required: true, message: 'Введите название' }] : []} >
              {field === 'value' || field.includes('rate') || field.includes('cost') ? <InputNumber placeholder={field} min={0} step={0.1} /> : <Input placeholder={field} />}
            </Form.Item>
          ))}
          <Form.Item>
            <Button type="primary" htmlType="submit" shape="round">Добавить</Button>
          </Form.Item>
        </Form>

        <Table
          bordered
          pagination={{ pageSize: 10, showSizeChanger: false }}
          dataSource={(dataMap[activeTab] || []).sort((a, b) => a.name.localeCompare(b.name))}
          columns={getColumns()}
          rowClassName="editable-row"
        />
      </Card>
    </>
  );
};

export default PricesAndCoefsPage;
