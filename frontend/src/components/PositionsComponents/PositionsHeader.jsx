import { Layout, InputNumber, Button, Space, Typography, message } from 'antd';
import React, { useRef, useState } from 'react';
const { Header } = Layout;
const { Text } = Typography;
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { addOrderPositions } from '../../slices/positionsSlice.js'

const PositionsHeader = () => {
    const orderNumberRef = useRef(null);
    const [disabled, setDisabled] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()
    const dispatch = useDispatch()
    let order = null
    const handleOnClick = async () => {
        const orderName = orderNumberRef.current
        setDisabled(true)
        try{
            await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/getOrder`, {
                params: { orderName },
                withCredentials: true,
            }).then(res => order = res.data)
            console.log(order)
            const positions = order.order.positions.rows.map( (position) => {
                return {
                    key: position.assortment.id,
                    name: position.assortment.name,
                    price: position.price,
                    added: true,
                    quantity: position.quantity
                }
            })
            dispatch(addOrderPositions(positions))
        }catch(error){
            messageApi.error('Не удалось получить заказ')
        }finally{
            setDisabled(false)
        }
    }
    console.log('render pos header')
    return (
        <>
            {contextHolder}
            <Header >
                <Space style={{ width: '100%' }} align="center" size="middle">
                    <Text style={{ color: '#fff' }}>Номер заказа</Text>
                    <InputNumber placeholder="Номер заказа" style={{ width: 120 }} onChange={(value) => { orderNumberRef.current = value }} />
                    <Button type="primary" shape="round" onClick={handleOnClick} disabled={disabled}>Найти</Button>
                    {order && 
                        <Text style={{ color: '#fff' }}>Номер заказа: {order.name}</Text>
                    }
                </Space>
            </Header>
        </>
    );
};

export default React.memo(PositionsHeader)
