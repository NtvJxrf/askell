import React, { useState, useEffect } from 'react';
import {
    Table, Form, Input, InputNumber, Button, Space, Card, Popconfirm, message, Typography
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import Init from '../init';
import { useDispatch } from "react-redux";
const { Title, Paragraph, Text } = Typography;

const PricesAndCoefsLayout = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState([]);
    const [addForm] = Form.useForm()
    const dispatch = useDispatch()
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/getPricesAndCoefs`,
                    { withCredentials: true }
                );
                const formattedData = response.data.map(item => ({ key: item.name, ...item }));
                setData(formattedData);
            } catch (err) {
                messageApi.error(err?.response?.data?.message || 'Ошибка при загрузке данных');
                console.error(err);
            }
        };
        fetchData();

        return async () => {
            await Init.getSelfcost(dispatch)
        }
    }, [messageApi, dispatch]);

    const onAdd = async values => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/createPricesAndCoefs`,
                values,
                { withCredentials: true }
            );
            messageApi.success('Создано на сервере');
            const newItem = { key: Date.now().toString(), ...values };
            setData(prev => [...prev, newItem]);
            addForm.resetFields();
        } catch (err) {
            messageApi.error(err.response?.data?.message || 'Ошибка при создании');
            console.error(err);
        }
    };

    const handleInputChange = (key, field, value) => {
        setData(prev =>
            prev.map(item => (item.key === key ? { ...item, [field]: value } : item))
        );
    };

    const save = async record => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/updatePricesAndCoefs`,
                record,
                { withCredentials: true }
            );
            messageApi.success('Обновлено на сервере');
        } catch (err) {
            messageApi.error(err.response?.data?.message || 'Ошибка при обновлении');
            console.error(err);
        }
    };

    const remove = async record => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/deletePricesAndCoefs`,
                record,
                { withCredentials: true }
            );
            messageApi.success('Удалено на сервере');
            setData(prev => prev.filter(item => item.key !== record.key));
        } catch (err) {
            messageApi.error(err.response?.data?.message || 'Ошибка при удалении');
            console.error(err);
        }
    };

    const handleSearch = (selectedKeys, confirm) => {
        confirm();
    };

    const handleReset = clearFilters => {
        clearFilters();
    };

    const getColumnSearchProps = dataIndex => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    placeholder={`Поиск по ${dataIndex}`}
                    value={selectedKeys[0]}
                    onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Поиск
                    </Button>
                    <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Сброс
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) =>
            record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase())
    });

    const columns = [
        {
            title: 'Название',
            dataIndex: 'name',
            width: 200,
            ...getColumnSearchProps('name'),
        },
        {
            title: 'Значение',
            dataIndex: 'value',
            width: 200,
            render: (text, record) => (
                <InputNumber
                    min={0}
                    step={0.1}
                    value={record.value}
                    style={{ width: 150 }}
                    formatter={val => (val % 1 === 0 ? `${parseInt(val)}` : `${val}`)}
                    onChange={val => handleInputChange(record.key, 'value', val)}
                />
            ),
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            width: 300,
            ...getColumnSearchProps('description'),
            render: (text, record) => (
                <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    value={record.description}
                    onChange={e => handleInputChange(record.key, 'description', e.target.value)}
                />
            ),
        },
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

    return (
        <>
            <Typography style={{ maxWidth: 1200, margin: '20px auto' }}>
                <Title level={4} style={{ textAlign: 'center' }}>
                    Описание цен и коэффициентов
                </Title>
                <Paragraph>
                    Здесь указываются стоимости работ, коэффициенты и другие значения, используемые в калькуляторах.
                </Paragraph>
                <Paragraph>
                    <Text strong>Важно:</Text> для цен на работы значения указываются в <Text code>копейках</Text>, так как MoySklad отдаёт данные по API в копейках.
                    Коэффициенты — это просто дробные числа.
                </Paragraph>
                <Paragraph>
                    Примеры:
                    <ul>
                        <li>
                            <Text code>Сверление СМД = 30000</Text> — это означает, что цена за 1 сверление СМД составляет <Text strong>300 рублей</Text>.
                        </li>
                        <li>
                            <Text code>Прямолинейка Шлифовка = 3692</Text> — это означает, что цена за шлифовку на прямолинейке составляет <Text strong>36.92 рубля</Text>.
                        </li>
                        <li>
                            <Text code>Стекло более 200 тыс = 1.6</Text> — это означает, что при расчетах стекла с выбранным типом клиента более 200 тыс цена будет умножаться на <Text strong>1.6</Text>.
                        </li>
                    </ul>
                </Paragraph>
            </Typography>

            <Card style={{ maxWidth: 1200, margin: '40px auto' }}>
                {contextHolder}
                <Form
                    form={addForm}
                    layout="inline"
                    onFinish={onAdd}
                    style={{
                        marginBottom: 24,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                        justifyContent: 'center',
                    }}
                >
                    <Form.Item name="name" rules={[{ required: true, message: 'Введите название' }]}>
                        <Input placeholder="Название" />
                    </Form.Item>
                    <Form.Item name="value" rules={[{ required: true, type: 'number', min: 0.1, message: '> 0' }]}>
                        <InputNumber placeholder="Значение" min={0} step={0.1} />
                    </Form.Item>
                    <Form.Item name="description">
                        <Input placeholder="Описание" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" shape="round">
                            Добавить
                        </Button>
                    </Form.Item>
                </Form>

                <Table
                    bordered
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    dataSource={data.sort((a, b) => a.name.localeCompare(b.name))}
                    columns={columns}
                    rowClassName="editable-row"
                />
            </Card>
        </>
    );
};

export default PricesAndCoefsLayout;
