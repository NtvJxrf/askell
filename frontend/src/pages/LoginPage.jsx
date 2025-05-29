import axios from 'axios'
import React, { useEffect, useState } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom'
import { setUser, setIsAuth } from '../slices/userSlice.js'
import { useDispatch } from 'react-redux'
const Login = () => {
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage()
    const [disabled, setDisabled] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const handleSubmit = async (value) => {
        try{
            setDisabled(true)
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, value, { withCredentials: true })
            if(response.status == 200){
                dispatch(setUser(response.data.user))
                dispatch(setIsAuth(true))
                return navigate('/')
            }
        }catch(error){
            messageApi.error(error.response.data.message)
        }finally{
            setDisabled(false)
        }
    }
  return (
    <>
        {contextHolder}
        <Row justify="center" align="middle" style={{ height: '100vh' }}>
            <Col>
                <Form form={form} name="horizontal_login" layout="inline" onFinish={handleSubmit} style={{}}>
                <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Please input your username!' }]}
                >
                    <Input prefix={<UserOutlined />} placeholder="Username" />
                </Form.Item>
                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                >
                    <Input prefix={<LockOutlined />} type="password" placeholder="Password" />
                </Form.Item>
                <Form.Item shouldUpdate>
                    {() => (
                    <Button
                        type="primary"
                        htmlType="submit"
                        disabled={disabled}
                    >
                        Log in
                    </Button>
                    )}
                </Form.Item>
                </Form>
            </Col>
        </Row>
    </>
  );
};
export default Login;