import { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Init from '../init';
import axios from 'axios';
import { useDispatch } from 'react-redux';
const { Title } = Typography;

const ActivatePage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [messageApi, contextHolder] = message.useMessage();
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false);

    const onFinish = async ({ password }) => {
        setLoading(true)
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/activate`, { password, token }, { withCredentials: true })
            messageApi.success('Пользователь активирован')
            await Init.checkAuth(dispatch, setLoading)
            setTimeout(() => {
                navigate('/')
            }, 1000);
        } catch (e) {
            console.error(e)
            messageApi.error(e?.response?.data?.message || 'Ошибка при установке пароля')
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/calculators');
        }
    }, [token, navigate]);
    if(!token) return 
    return (
        <div style={{ maxWidth: 500, margin: 'auto', marginTop: 60 }}>
            {contextHolder}
            <Title level={3}>Установите пароль</Title>

        
            <Form onFinish={onFinish} layout="vertical">
                <Form.Item name="password" label="Новый пароль" rules={[
                        { required: true, message: 'Введите пароль' },
                        { min: 6, message: 'Минимум 6 символов' },
                    ]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item name="confirm" label="Подтвердите пароль" dependencies={['password']} rules={[
                    { required: true, message: 'Повторите пароль' },
                    ({ getFieldValue }) => ({
                        validator(_, value) {
                            if (!value || getFieldValue('password') === value)
                                return Promise.resolve()
                            return Promise.reject(new Error('Пароли не совпадают'));
                        },
                    }),
                ]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        Установить пароль
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default ActivatePage;
