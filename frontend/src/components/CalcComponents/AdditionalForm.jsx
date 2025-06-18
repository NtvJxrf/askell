import { setForm } from '../../slices/AdditionalFormSlice.js'
import store from '../../store.js'
import { useDispatch, useSelector } from "react-redux";
import { Form, Select, InputNumber } from 'antd'
import React from 'react';
const AdditionalForm = () => {
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const handleValuesChange = (_, newValues) => {
        dispatch(setForm(newValues));
    };
    console.log('add form render')
    return (
        <Form
            name='additionalForm'
            form={form}
            layout="horizontal"
            size="small"
            onValuesChange={handleValuesChange}
            style={{ margin: '0 auto', marginTop: 30, maxWidth:400 }}
            initialValues={{
                rounding: 'Округление до 0.5',
                customertype: 'Менее 200 тыс.',
                trim: 1.2
            }}
        >
            <Form.Item key='Округление' label='Округление' name='rounding'>
                <Select showSearch mode="combobox" options={[
                    { value: 'Округление до 0.5', label: 'Округление до 0.5' },
                    { value: 'Умножить на 2', label: 'Умножить на 2' }
                ]}/>
            </Form.Item>
            <Form.Item key='Тип клиента' label='Тип клиента' name='customertype' >
                <Select showSearch mode="combobox" options={[
                    { value: 'Менее 200 тыс.', label: 'Менее 200 тыс.' },
                    { value: 'Более 200 тыс.', label: 'Более 200 тыс.' },
                    { value: 'Более 400 тыс.', label: 'Более 400 тыс.' },
                    { value: 'Более 800 тыс.', label: 'Более 800 тыс.' }
                ]}/>
            </Form.Item>
        </Form>
    )
}

export default React.memo(AdditionalForm)