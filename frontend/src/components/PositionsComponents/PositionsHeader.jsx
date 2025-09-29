import { Input, Button, Space, Typography, message, Upload, Dropdown, Menu, Tooltip, Popover} from 'antd';
import React, { useRef, useState } from 'react';
import { UploadOutlined, DownOutlined, InfoCircleOutlined } from '@ant-design/icons';
const { Text } = Typography;
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { addOrderPositions, setOrder, setPositions, addNewPosition, addNewPositions, setSelectedRowKeys, setDisplayPrice } from '../../slices/positionsSlice.js'
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
const pricesDescription = (
  <>
    Выше госта: Повышенное требование<br />
    Розница: Менее 200тыс.<br />
    Опт: Более 200тыс.<br />
    Дилер: Более 400тыс.<br />
    ВИП: Более 800тыс.<br />
  </>
);
const priceItems = [
        { key: 'gostPrice', label: 'Выше госта' },
        { key: 'retailPrice', label: 'Розница' },
        { key: 'bulkPrice', label: 'Опт' },
        { key: 'dealerPrice', label: 'Дилер' },
        { key: 'vipPrice', label: 'ВИП' },
];
const priceMap = priceItems.reduce((acc, { key, label }) => {
    acc[label] = key;
    return acc;
}, {});
const reverseMap = priceItems.reduce((acc, { key, label }) => {
    acc[key] = label;
    return acc;
}, {});
const PositionsHeader = () => {
    const orderNumberRef = useRef(null);
    const [disabled, setDisabled] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()
    const order = useSelector(state => state.positions.order)
    const priceType = useSelector(state => state.positions.displayPrice)
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
            console.log(res.data)
            dispatch(setOrder(res.data))
            if(!res.data.positions){
                dispatch(addOrderPositions([]))
                return
            }
            const positions = res.data.positions.rows.map( (position) => {
                return {
                    key: position.assortment.id,
                    name: position.assortment.name,
                    prices: position.assortment.salePrices.reduce((acc, curr) => {
                        acc[priceMap[curr.priceType.name]] = curr.value / 100
                        return acc
                    }, {}),
                    added: true,
                    quantity: position.quantity,
                    result: position.result,
                    initialData: position.initialData,
                    position
                }
            })
            try{
                const salePrices = res.data.positions.rows[0].assortment.salePrices;
                const price = Math.round(res.data.positions.rows[0].price)
                const match = salePrices.find(p => Math.round(p.value) === price)
                dispatch(setDisplayPrice(priceMap[match.priceType.name]))
                messageApi.success(`Установлен тип цен ${match.priceType.name}`)
            }catch(error){
                console.error(error)
                messageApi.warning('Не удалось подобрать тип цен, установлено "Розница"')
                dispatch(setDisplayPrice('retailPrice'))
            }
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
        messageApi.warning('Установлен тип цен "Розница"')
        dispatch(setDisplayPrice('retailPrice'))
    }
    const handleSaveOrder = async () => {
        setDisabled(true)
        const data = store.getState().positions
        const { productionLoad, ...dataToSend } = data
        if(!data.order){
            messageApi.error('Загрузите заказ')
            setDisabled(false)
            return
        }
        try{
            await axios.post(`${import.meta.env.VITE_API_URL}/api/sklad/addPositionsToOrder`, dataToSend, { withCredentials: true})
            dispatch(setPositions([]))
            handleSearchClick(order.name)
            messageApi.success('Заказ обновлен')
        }catch(error){
            console.error(error)
            messageApi.error(error?.data?.message || 'Не удалось сохранить заказ')
        }finally{
            setDisabled(false)
        }
    }
    const handleDeleteSelected = () => {
        const selected = store.getState().positions.selectedPosition
        console.log(selected)
        if(!selected){
            messageApi.error('Нечего удалять')
            return
        }
        const positions = store.getState().positions.positions.filter( (position) => {
            return !selected.includes(position.key)
        })
        dispatch(setPositions(positions))
        dispatch(setSelectedRowKeys(null))
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
    const handlePriceSelect = ({ key }) => {
        dispatch(setDisplayPrice(key))
    };
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
                    <Input placeholder="Номер заказа" style={{ width: 80 }} onChange={(e) => { orderNumberRef.current = e.target.value }} onPressEnter={() => handleSearchClick()} />
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
                    <Popover content={pricesDescription} trigger={'hover'} placement='right'>
                        <Dropdown menu={{ items: priceItems, onClick: handlePriceSelect }} disabled={disabled} >
                            
                                <Button type="default" shape="round">
                                    Цены: {reverseMap[priceType]} <DownOutlined />
                                    {/* <Tooltip title={pricesDescription} styles={{ fontSize: '16px', padding: '12px 16px', maxWidth: 800 }}>
                                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                                    </Tooltip> */}
                                </Button>
                        </Dropdown>
                    </Popover>
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
                                const positions = array.reduce((acc, el, index) => {
                                    try {
                                        const result = calcMap[el.calcType](el, selfcost);
                                        if (result) acc.push(result);
                                    } catch (error) {
                                        console.error(error);
                                        messageApi.error(`Позиция с номером ${index + 1} не добавлена`)
                                    }
                                    return acc;
                                }, []);
                                dispatch(addNewPositions(positions))
                            };
                            reader.readAsArrayBuffer(file);
                            return false
                        }}
                        disabled={disabled}
                    >
                        <Button icon={<UploadOutlined />} shape="round">Загрузить из xlsm</Button>
                    </Upload>
                </Space>
            </div>

        </>
    );
};

export default React.memo(PositionsHeader)
