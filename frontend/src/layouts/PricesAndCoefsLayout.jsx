import { useState, useEffect } from 'react';
import {
    Table, Form, Input, InputNumber, Button, Space, Card, Popconfirm,
    message, Typography, Tabs
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import Init from '../init';
import { useDispatch } from "react-redux";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const PricesAndCoefsLayout = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [prices, setPrices] = useState([]);
    const [coefs, setCoefs] = useState([]);
    const [type, setType] = useState('price');
    const [addForm] = Form.useForm();
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/getPricesAndCoefs`,
                    { withCredentials: true }
                );
                const formattedData = response.data.map(item => ({
                    key: item.name,
                    ...item,
                    value: item.type === 'price' ? item.value / 100 : item.value
                }));

                setPrices(formattedData.filter(item => item.type === 'price'));
                setCoefs(formattedData.filter(item => item.type === 'coef'));
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
            const fullData = { ...values, type, value: type === 'price' ? Math.round(values.value * 100) : values.value };
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/createPricesAndCoefs`,
                fullData,
                { withCredentials: true }
            );
            messageApi.success('Создано на сервере');
            const newItem = { key: Date.now().toString(), ...values };
            console.log(newItem)
            if (type === 'price') {
                setPrices(prev => [...prev, newItem]);
            } else {
                setCoefs(prev => [...prev, newItem]);
            }

            addForm.resetFields();
        } catch (err) {
            messageApi.error(err.response?.data?.message || 'Ошибка при создании');
            console.error(err);
        }
    };

    const handleInputChange = (key, field, value) => {
        const updater = list => list.map(item =>
            item.key === key ? { ...item, [field]: value } : item
        );

        if (type === 'price') {
            setPrices(updater);
        } else {
            setCoefs(updater);
        }
    };


    const save = async record => {
        try {
            const dataToSend = {
                ...record,
                value: type === 'price' ? Math.round(record.value * 100) : record.value
            };
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/pricesAndCoefs/updatePricesAndCoefs`,
                dataToSend,
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

            if (type === 'price') {
                setPrices(prev => prev.filter(item => item.key !== record.key));
            } else {
                setCoefs(prev => prev.filter(item => item.key !== record.key));
            }
        } catch (err) {
            messageApi.error(err.response?.data?.message || 'Ошибка при удалении');
            console.error(err);
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
                    <Text strong>Важно:</Text> для цен на работы значения указываются в <Text code>рублях</Text>.
                    Коэффициенты — это просто дробные числа.
                </Paragraph>
                <Paragraph>
                    Примеры:
                    <ul>
                        <li>
                            <Text code>Сверление СМД = 300</Text> — это означает, что цена за 1 сверление СМД составляет <Text strong>300 рублей</Text>.
                        </li>
                        <li>
                            <Text code>Стекло Более 200 тыс. = 1.6</Text> — это означает, что при расчетах стекла с выбранным типом клиента более 200 тыс цена будет умножаться на <Text strong>1.6</Text>.
                        </li>
                    </ul>
                </Paragraph>
            </Typography>

            <Card style={{ maxWidth: 1200, margin: '40px auto' }}>
                {contextHolder}

                <Tabs
                    defaultActiveKey="price"
                    onChange={key => setType(key)}
                    centered
                    style={{ marginBottom: 24 }}
                >
                    <TabPane tab="Цены" key="price" />
                    <TabPane tab="Коэффициенты" key="coef" />
                </Tabs>

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
                    dataSource={(type === 'price' ? prices : coefs).sort((a, b) => a.name.localeCompare(b.name))}
                    columns={columns}
                    rowClassName="editable-row"
                />
            </Card> 
        </>
    );
};

export default PricesAndCoefsLayout;
