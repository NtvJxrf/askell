import React, { useState, useEffect, useMemo } from "react";
import { Form, InputNumber, Select, Checkbox, Space, message, Divider, Row, Col } from "antd";
import { useDispatch, useSelector } from "react-redux";
import SubmitButton from "../buttons/SubmitButton.jsx";
import ResetButton from "../buttons/ResetButton.jsx";
import { setForm, clearForm } from '../../../slices/formSlice.js'
import store from '../../../store.js'
import SMDForm from './SMDForm.jsx'
import glassForm from './glassForm.jsx'
import triplexForm from './triplexForm.jsx'
import triplexCalc from '../calculators/triplexCalc.js'
import { addNewPosition } from "../../../slices/positionsSlice.js";
const DynamicForm = ({type}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const formData = store.getState().forms[type]
    const additionalFormData = useSelector(state => state.additionalForm.additionalForm)
    const selfcost = useSelector(state => state.selfcost.selfcost)
    const onFinish = async (value) => {
        const position = triplexCalc({...value, ...additionalFormData}, selfcost)
        dispatch(addNewPosition(position))
        messageApi.success('Позиция добавлена')
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

    useEffect( ()=> {
        form.resetFields()
        form.setFieldsValue(formData)
    }, [formData])
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
}

export default React.memo(DynamicForm)