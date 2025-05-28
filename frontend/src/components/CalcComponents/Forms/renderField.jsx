import { Form, Select, InputNumber, Divider, Checkbox } from 'antd'

const renderField = (field) => {
    switch (field.type) {
    case 'select':
        return (
            <Form.Item key={field.name} label={field.label} name={field.name} rules={field.rules}>
                <Select showSearch mode="combobox" options={field.options.map(option => ({ label: option, value: option }))}/>
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

export default renderField