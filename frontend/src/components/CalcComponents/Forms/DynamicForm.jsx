import React, { useState, useEffect, useMemo } from "react";
import { Form, InputNumber, Select, Checkbox, Space, message, Divider, Row, Col } from "antd";
import { useDispatch } from "react-redux";
import SubmitButton from "./SubmitButton";
import ResetButton from "./ResetButton";
import { setForm, clearForm } from '../../../slices/formSlice.js'
import store from '../../../store.js'
import SMDForm from './SMDForm.jsx'
import glassForm from './glassForm.jsx'
import triplexForm from './triplexForm.jsx'
const DynamicForm = React.memo(({type}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();

    const dispatch = useDispatch();
    const formData = store.getState().forms[type]
    console.log(formData)
    const onFinish = async (value) => {
        console.log(value);
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000)
        messageApi.success('123');
    };



    const handleValuesChange = (_, allValues) => {
        dispatch(setForm({ formType: type, values: allValues }));
    };
    
    const handleClearForm = () => {
        form.resetFields()
        dispatch(clearForm(type));
    }

    const formsMap = {
        SMDForm,
        glassForm,
        triplexForm,
    }
    const FormComponent = formsMap[type];
    return (
        <>
            {contextHolder}
            {console.log('render dynamic form')}
            <Form
                name={type}
                form={form}
                layout="horizontal"
                size="small"
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
                initialValues={formData}
                style={{ margin: '0 auto', marginTop: 30 }}
            >
                {FormComponent ? <FormComponent form={form} /> : <div>Форма не найдена</div>}
                <Form.Item style={{ display: 'flex', justifyContent: 'center'}}>
                    <Space size={15}>
                        <SubmitButton form={form} onFinish={onFinish}/>
                        <ResetButton handleClearForm={handleClearForm} />
                    </Space>
                </Form.Item>
            </Form>
        </>
    );
});

export default DynamicForm