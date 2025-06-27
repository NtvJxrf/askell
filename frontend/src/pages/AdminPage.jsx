import React, { useEffect, useState } from "react";
import { Card, Form, Input, Button, Select, Alert, Typography, Table, message, Row, Col, Tag } from "antd";
const { Paragraph } = Typography;
import axios from "axios";
const { Option } = Select;

const rolesMap = {
    'Администратор': 'admin',
    'Менеджер': 'manager',
    'Бухгалтер': 'accountant',
}
const roles = Object.keys(rolesMap)
const rolesMapReverse = Object.fromEntries(
    Object.entries(rolesMap).map(([ru, en]) => [en, ru])
)
export default function AdminPage() {
    const [form] = Form.useForm();
    const [users, setUsers] = useState([])
    const [messageApi, contextHolder] = message.useMessage();
    const [response, setResponse] = useState(null)
    const onFinish = async (values) => {
        try{
            console.log(values)
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/createUser`, {...values, roles: values.roles.map(el => rolesMap[el])}, { withCredentials: true })
            setResponse(res.data)
            messageApi.success("Пользователь добавлен");
        }catch(error){
            console.error(error)
            messageApi.error('Ошибка при добавлении пользователя')
        }
        console.log(values)
        form.resetFields();
    };

    useEffect(() => {
        const getUsers = async () => {
            try{
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/getUsers`, { withCredentials: true })
                setUsers(response.data.map(user => {
                    return {
                        ...user,
                        roles: user.roles.map(el => rolesMapReverse[el]),
                    }
                }))
            }catch(error){
                console.error(error)
                messageApi.error('Ошибка при получении пользователей')
            }
        }
        getUsers()
    }, [])
    const columns = [
        { title: "Логин", dataIndex: "username", key: "username" },
        { title: "Роли", dataIndex: "roles", key: "roles",
        render: (roles) => roles.map((r) => <Tag key={r}>{r}</Tag>),
        },
    ]

    return (
        <Row >
            {contextHolder}
            <Col span={8}>
                <Card title="Добавить пользователя" style={{ borderRadius: 0 }}>
                    <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
                        <Form.Item name="username" label="Логин" rules={[{ required: true, message: 'Fill this field' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="roles" label="Роли" rules={[{ required: true, message: 'Fill this field' }]}>
                            <Select mode="multiple" placeholder="Выбери роли">
                                {roles.map((r) => (
                                    <Option key={r}>{r}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType='submit' shape="round" >
                                Добавить
                            </Button>
                        </Form.Item>
                    </Form>
                    {response && (
                        <div style={{ marginTop: 16 }}>
                            <Alert
                                type="success"
                                message="Ссылка для установки пароля"
                                description={
                                    <Paragraph copyable style={{ marginBottom: 0, wordBreak: 'break-all' }}>
                                        {response}
                                    </Paragraph>
                                }
                                showIcon
                            />
                        </div>
                    )}
                </Card>
            </Col>
            <Col span={16}>
                <Card title="Список пользователей" style={{ borderRadius: 0 }}>
                    <Table dataSource={users} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} />
                </Card>
            </Col>
        </Row>
    )
}
