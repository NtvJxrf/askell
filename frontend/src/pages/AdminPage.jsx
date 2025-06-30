import React, { useCallback, useEffect, useState } from "react";
import { Card, Form, Input, Button, Select, Alert, Typography, Table, message, Row, Col, Tag, Space, Popconfirm, Tooltip  } from "antd";
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
    const [responseForm, setResponseForm] = useState(null)
    const [responseTable, setResponseTable] = useState(null)
    const [loading, setLoading] = useState(false)
    const onFinish = async (values) => {
        try{
            setLoading(true)
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/createUser`, {...values, roles: values.roles.map(el => rolesMap[el])}, { withCredentials: true })
            setResponseForm(res.data)
            messageApi.success("Пользователь добавлен");
            getUsers()
        }catch(error){
            console.error(error)
            messageApi.error(error?.response?.data?.message || 'Ошибка при добавлении пользователя')
        }finally{
            setLoading(false)
        }
        console.log(values)
        form.resetFields();
    }

    const handleResetPassword = async (record) => {
        try{
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/resetUserPassword`, {id: record.id}, { withCredentials: true })
            messageApi.success('Пароль пользователя сброшен')
            setResponseTable(response.data)
        }catch(error){
            console.error(error)
            getUsers()
            messageApi.error(error?.response?.data?.message || 'Ошибка при обновлении данных пользователя')
        }
    }

    const handleDelete = async (record) => {
        try{
            const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/user/delete`, {data: {id: record.id, force: true}, withCredentials: true})
            messageApi.success('Пользователь удален')
        }catch(error){
            console.error(error)
            messageApi.error(error?.response?.data?.message || 'Ошибка при обновлении данных пользователя')
        }finally{
            getUsers()
        }
    }

    const handleSave = async (record) => {
        try{
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/update`, {id: record.id, data: {roles: record.roles.map(el => rolesMap[el])}}, { withCredentials: true })
            messageApi.success('Пользователь обновлен')
        }catch(error){
            console.error(error)
            getUsers()
            messageApi.error(error?.response?.data?.message || 'Ошибка при обновлении данных пользователя')
        }
    }

    const getUsers = useCallback(async () => {
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
                messageApi.error(error.response?.data?.message || 'Ошибка при получении пользователей')
            }
        }, [messageApi])

    useEffect(() => {
        getUsers()
    }, [getUsers])
    const columns = [
        { title: "Логин", dataIndex: "username", key: "username", ellipsis: true, width: 200 },
        { title: "Активирован", dataIndex: "isActive", key: "isActive", render: (el) => el ? 'Да' : 'Нет', width: 150 },
        { title: "Роли", dataIndex: "roles", key: "roles",
            render: (data, record) => {
                return (
                    <Select mode="multiple" popupMatchSelectWidth={false} maxTagCount={2} placeholder="Выбери роли" value={data} onChange={(newData) => {
                        setUsers(prevUsers =>
                            prevUsers.map(user =>
                                user.id === record.id
                                    ? { ...user, roles: newData }
                                    : user
                            )
                        )
                    }}>
                        {roles.map((r) => (
                            <Option key={r}>{r}</Option>
                        ))}
                    </Select>
                )
            }
        },
        {title: 'Действия', key: 'actions', render: (_, record) => (
        <Space>
            <Button type="link" onClick={() => handleSave(record)}>Сохранить</Button>
            <Button type="link" onClick={() => handleResetPassword(record)}>Сбросить пароль</Button>
            <Popconfirm
                title="Уверены, что хотите удалить?"
                onConfirm={() => handleDelete(record)}
                okText="Да"
                cancelText="Нет"
            >
                <Button type="link" danger>Удалить</Button>
            </Popconfirm>
        </Space>
        )},
    ]
    console.log('render admin')
    return (
        <Row >
            {contextHolder}
            <Col span={8}>
                <Card title="Добавить пользователя" style={{ borderRadius: 0, height: '100%', boxShadow: 'none' }}>
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
                            <Button type="primary" htmlType='submit' shape="round" disabled={loading}>
                                Добавить
                            </Button>
                        </Form.Item>
                    </Form>
                    {responseForm && (
                        <div style={{ marginTop: 16 }}>
                            <Alert
                                type="success"
                                message="Ссылка для установки пароля"
                                description={
                                    <Paragraph copyable style={{ marginBottom: 0, wordBreak: 'break-all' }}>
                                        {responseForm}
                                    </Paragraph>
                                }
                                showIcon
                            />
                        </div>
                    )}
                </Card>
            </Col>
            <Col span={16}>
                <Card title="Список пользователей" style={{ borderRadius: 0, height: '100%' }}>
                    <Table dataSource={users} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} scroll={{ x: 'max-content' }} />
                    {responseTable && (
                        <div style={{ marginTop: 16 }}>
                            <Alert
                                type="success"
                                message="Ссылка для установки пароля"
                                description={
                                    <Paragraph copyable style={{ marginBottom: 0, wordBreak: 'break-all' }}>
                                        {responseTable}
                                    </Paragraph>
                                }
                                showIcon
                            />
                        </div>
                    )}
                </Card>
            </Col>
        </Row>
    )
}
