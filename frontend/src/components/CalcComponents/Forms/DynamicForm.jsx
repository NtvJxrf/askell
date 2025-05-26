import React, { useState, useEffect, useMemo } from "react";
import { Form, InputNumber, Select, Checkbox, Space, message, Divider, Row, Col } from "antd";
import { useDispatch } from "react-redux";
import SubmitButton from "./SubmitButton";
import ResetButton from "./ResetButton";
import formConfigs from "./formConfig";
import { setForm, clearForm } from '../../../slices/formSlice.js'
import store from '../../../store.js'
const DynamicForm = React.memo(({type}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();

    const dispatch = useDispatch();
    const formData = store.getState().forms[type]
    console.log(formData)
    const onFinish = async (value) => {
        console.log(value);
        messageApi.success('harosh');
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000)
        console.log('zakonchil')
    };  

    useEffect(() => {
        form.resetFields();
        form.setFieldsValue(formData);
    }, [type]);


    const handleValuesChange = (_, allValues) => {
        dispatch(setForm({ formType: type, values: allValues }));
    };
    
    const handleClearForm = () => {
        form.resetFields()
        dispatch(clearForm(type));
    }

    return (
        <>
            {contextHolder}
            {console.log('yy render')}
            <Form
                name={type}
                form={form}
                layout="horizontal"
                size="small"
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
                style={{ margin: '0 auto', marginTop: 30 }}
            >
                <div style={{ maxWidth: 400, margin: '0 auto' }}>
                    {formConfigs[type].commonFields.map((field) => renderField(field))}
                </div>
                
                <div style={{ maxWidth: 800, margin: '0 auto', marginTop: 20 }}>
                    {formConfigs[type].materialFields && renderMaterialFields(formConfigs[type].materialFields)}
                </div>
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

const renderField = (field, dynamicOptions = {}) => {
    switch (field.type) {
    case 'select':
        const options = dynamicOptions[field.name] || field.options || [];
        return (
            <Form.Item key={field.name} label={field.label} name={field.name} rules={field.rules}>
                <Select showSearch mode="combobox" options={options.map(opt => (
                typeof opt === 'string' ? { label: opt, value: opt } : opt
                ))} />
            </Form.Item>
        );
    case 'checkbox':
        return (
        <Form.Item
            key={field.name}
            valuePropName="checked"
            label={field.label}
            name={field.name}
            rules={field.rules}
            initialValue={false}
        >
            <Checkbox />
        </Form.Item>
        );
    case 'input':
        return (
        <Form.Item key={field.name} label={field.label} name={field.name} rules={field.rules}>
            <InputNumber style={{ width: '100%' }} {...field.props} />
        </Form.Item>
        );
    case 'divider': 
        return(
            <Divider>{field.label}</Divider>

        )
    default:
        return null;
    }
}
const renderMaterialFields = (fields) => {
    return (
        <Row gutter={24}>
            {Array.from({ length: fields.count }, (_, index) => (
                <Col span={24 / fields.count} key={index}>
                    <h4>Материал {index + 1}</h4>
                    {fields.form.map(item => renderField({
                        ...item,
                        name: `${item.name}${index + 1}`
                    }))}
                </Col>
            ))}
        </Row>
    )
}
export default DynamicForm