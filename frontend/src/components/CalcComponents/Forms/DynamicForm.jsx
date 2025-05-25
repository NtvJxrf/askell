import React, { useState, useEffect, useMemo} from "react";
import { Form, InputNumber, Select, Checkbox, Space, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import SubmitButton from "./SubmitButton";
import ResetButton from "./ResetButton";
import formConfigs from "./formConfig";
import { setForm, clearForm } from '../../../slices/formSlice.js'
const DynamicForm = React.memo(({type}) => {
    const [isDisabled, setIsDisabled] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const formData = useSelector((state) => state.forms[type]);

    const onFinish = (value) => {
        console.log(value);
        messageApi.success('harosh');
        setIsDisabled(true);
        setTimeout(() => setIsDisabled(false), 1000);
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
    const fields = useMemo(() => formConfigs[type].fields, [type]);

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
                style={{ maxWidth: 400, margin: '0 auto', marginTop: 30 }}
            >
                {fields.map((field) => {
                    switch (field.type) {
                    case 'select':
                        return (
                        <Form.Item key={field.name} label={field.label} name={field.name} rules={field.rules}>
                            <Select showSearch mode="combobox" options={field.options.map(opt => ({ label: opt, value: opt }))} />
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
                    default:
                        return null;
                    }
                })}
                <Form.Item style={{ display: 'flex', justifyContent: 'center'}}>
                    <Space size={15}>
                        <SubmitButton isDisabled={isDisabled} />
                        <ResetButton handleClearForm={handleClearForm} />
                    </Space>
                </Form.Item>
            </Form>
        </>
    );
});

export default DynamicForm