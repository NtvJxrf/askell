import { Input, Button, Space, Typography, message, Upload } from 'antd';
import React, { useRef, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
const { Text } = Typography;
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { addOrderPositions, setOrder, setPositions, addNewPosition, addNewPositions } from '../../slices/positionsSlice.js'
import store from '../../store.js';
import packaging from '../CalcComponents/calculators/packaging.js'
import * as XLSX from 'xlsx';

import triplexCalc from '../../components/CalcComponents/calculators/triplexCalc.js'
import ceraglassCalc from '../../components/CalcComponents/calculators/ceraglassCalc.js'
import glassCalc from '../../components/CalcComponents/calculators/glassCalc.js'
import SMDCalc from '../../components/CalcComponents/calculators/SMDCalc.js'
import glasspacketCalc from '../../components/CalcComponents/calculators/glasspacketCalc.js'

const calcMap = {
    'Триплекс': triplexCalc,
    'Керагласс': ceraglassCalc,
    'Стекло': glassCalc,
    'СМД': SMDCalc,
    'Стеклопакет': glasspacketCalc
}

const PositionsHeader = () => {
    const orderNumberRef = useRef(null);
    const [disabled, setDisabled] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()
    const order = useSelector(state => state.positions.order)
    const dispatch = useDispatch()
    const handleSearchClick = async (value = null) => {
        const orderName = typeof value === 'object' ? orderNumberRef.current : value
        if(!orderName){
            messageApi.error('Введите номер заказа')
            return
        }
        setDisabled(true)
        try{
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/getOrder`, {
                params: { orderName },
                withCredentials: true,
            })
            dispatch(setOrder(res.data))
            if(!res.data.positions){
                dispatch(addOrderPositions([]))
                return
            }
            const positions = res.data.positions.rows.map( (position) => {
                return {
                    key: position.assortment.id,
                    name: position.assortment.name,
                    price: position.price,
                    added: true,
                    quantity: position.quantity,
                    result: position.result,
                    initialData: position.initialData,
                    position
                }
            })
            dispatch(addOrderPositions(positions))
        }catch(error){
            console.error(error)
            messageApi.error('Не удалось получить заказ')
        }finally{
            setDisabled(false)
        }
    }
    const handleResetClick = () => {
        dispatch(setOrder({}))
        dispatch(addOrderPositions([]))
    }
    const handleSaveOrder = async () => {
        const data = store.getState().positions
        if(!data.order){
            messageApi.error('Загрузите заказ')
            return
        }
        setDisabled(true)
        try{
            await axios.post(`${import.meta.env.VITE_API_URL}/api/sklad/addPositionsToOrder`, data, { withCredentials: true})
            dispatch(setPositions([]))
            handleSearchClick(order.name)
            messageApi.success('Заказ обновлен')
        }catch(error){
            console.error(error)
            messageApi.error('Не удалось сохранить заказ')
        }finally{
            setDisabled(false)
        }
    }
    const handleDeleteSelected = () => {
        const selected = store.getState().positions.selectedPosition
        if(!selected) return 
        const positions = store.getState().positions.positions.filter( (position) => {
            return !selected.includes(position.key)
        })
        dispatch(setPositions(positions))
    }

    const handlePackaging = () => {
        const positions = store.getState().positions.positions
        if(!positions.length) {
            messageApi.error('Нет позиций')
            return
        }
        const result = packaging(positions)
        if(!result){
            messageApi.error('Нет подходящих позиций')
            return
        }
        dispatch(addNewPosition(result))
    }

    console.log('render pos header')
    return (
        <>
            {contextHolder}
            <div
                style={{
                    padding: '16px',
                    backgroundColor: '#001529',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}
            >
                <Space style={{ width: '100%' }} align="center" size="middle">
                    <Text style={{color: '#fff'}}>Номер заказа: </Text>
                    <Input placeholder="Номер заказа" style={{ width: 80 }} onChange={(e) => { orderNumberRef.current = e.target.value }} />
                    <Button type="primary" shape="round" onClick={handleSearchClick} disabled={disabled}>Найти</Button>
                    <Button type="primary" shape="round" onClick={handleResetClick} disabled={disabled}>Сбросить</Button>
                </Space>
                <Space align="center" size="middle" wrap>
                    <Text style={{color: '#fff'}}>Номер заказа: {order?.name}</Text>
                    <Text style={{color: '#fff'}}>Контрагент: {order?.agent?.name}</Text>
                    <Text style={{color: '#fff'}}>Создано: {order?.created ? new Date(order.created).toLocaleDateString() : ''}</Text>
                </Space>
                <Space>
                    <Button type="default" shape="round" onClick={handleSaveOrder} disabled={disabled}>Сохранить</Button>
                    <Button type="default" shape="round" onClick={handleDeleteSelected} disabled={disabled} danger>Удалить выделенное</Button>
                    <Button type="default" shape="round" onClick={handlePackaging} disabled={disabled}>Упаковка</Button>
                    <Upload
                        accept=".xlsx, .xls, .xlsm"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            const reader = new FileReader();
                            const selfcost = store.getState().selfcost.selfcost
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
                                const positions = array.map( el => calcMap[el.calcType](el, selfcost))
                                dispatch(addNewPositions(positions))
                            };
                            reader.readAsArrayBuffer(file);
                            return false
                        }}
                        disabled={disabled}
                    >
                        <Button icon={<UploadOutlined />} shape="round">Загрузить из xlsx</Button>
                    </Upload>
                </Space>
            </div>

        </>
    );
};

export default React.memo(PositionsHeader)
