import React, { useEffect } from "react";
import { Form, Space, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import SubmitButton from "../buttons/SubmitButton.jsx";
import ResetButton from "../buttons/ResetButton.jsx";
import { setFormData, clearForm } from '../../../slices/formSlice.js'
import store from '../../../store.js'
import SMDForm from './SMDForm.jsx'
import GlassForm from './glassForm.jsx'
import TriplexForm from './TriplexForm.jsx'
import CeraglassForm from "./CeraglassForm.jsx";
import GlassPacketForm from './GlasspacketForm.jsx'
import triplexCalc from '../calculators/triplexCalc.js'
import ceraglassCalc from '../calculators/ceraglassCalc.js'
import glassCalc from '../calculators/glassCalc.js'
import SMDCalc from '../calculators/SMDCalc.js'
import glasspacketCalc from '../calculators/glasspacketCalc.js'
import { addNewPosition } from "../../../slices/positionsSlice.js";
const calcMap = {
    TriplexForm: triplexCalc,
    CeraglassForm: ceraglassCalc,
    GlassForm: glassCalc,
    SMDForm: SMDCalc,
    GlassPacketForm: glasspacketCalc
}
const formsMap = {
    SMDForm,
    GlassForm,
    TriplexForm,
    CeraglassForm,
    GlassPacketForm
}
const DynamicForm = ({type, form}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const dispatch = useDispatch();
    const formData = store.getState().forms[type]
    const selfcost = useSelector(state => state.selfcost.selfcost)
    const onFinish = async (value) => {
        const triplex = store.getState().positions.triplexForGlasspacket
        const position = calcMap[type]({...value}, selfcost, triplex)
        dispatch(addNewPosition(position))
        messageApi.success('Позиция добавлена')
    }

    const handleValuesChange = (_, allValues) => {
        dispatch(setFormData({ formType: type, values: allValues }));
    }
    
    const handleClearForm = () => {
        form.resetFields()
        dispatch(clearForm(type));
    }
    const FormComponent = formsMap[type];

    useEffect( ()=> {
        form.resetFields()
        form.setFieldsValue(formData)
    }, [formData, form])
    console.log('render dynamic form')
    return (
        <>
            {contextHolder}
            <Form
                name={type}
                form={form}
                layout="horizontal"
                size="small"
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
                style={{ margin: '0 auto', marginTop: 30 }}
                initialValues={{
                    rounding: 'Округление до 0.5',
                    customertype: 'Менее 200 тыс.'
                }}
            >
                {FormComponent ? <FormComponent /> : <div>Форма не найдена</div>}
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