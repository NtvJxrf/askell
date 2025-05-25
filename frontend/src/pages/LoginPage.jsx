import axios from 'axios'
import React, { useEffect, useState } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom'

const Login = ({setIsAuth}) => {
    const [form] = Form.useForm();
    const [clientReady, setClientReady] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [messageApi, contextHolder] = message.useMessage()
    const navigate = useNavigate()
    

    const handleSubmit = async (value) => {
        try{
            setClientReady(false)
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, value, { withCredentials: true })
            if(response.status == 200){
                localStorage.setItem('id', response.data.user.id)
                localStorage.setItem('role', response.data.user.role)
                setIsAuth(true)
                return navigate('/calcs/ballons')
            }
        }catch(error){
            setClientReady(true)
            setSubmitError(error.response?.data?.message || 'An error occurred');
        }
    };
    
    useEffect(() => {
        setClientReady(true);
    }, []);
    useEffect(() => {
        if (submitError) {
            messageApi.open({
                type: 'error',
                content: submitError,
                duration: 5
            });
            setSubmitError(null);
        }
    }, [submitError, messageApi]);
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
                        disabled={
                        !clientReady ||
                        !form.isFieldsTouched(true) ||
                        !!form.getFieldsError().filter(({ errors }) => errors.length).length
                        }
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