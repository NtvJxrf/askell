import { Form, Select, InputNumber, Divider, Checkbox } from 'antd'

const renderField = (field) => {
    switch (field.type) {
    case 'select':
        return (
            <Form.Item key={field.name} label={field.label} name={field.name} rules={field.rules}>
                <Select showSearch mode="combobox" options={field?.options?.map(option => ({ label: option, value: option }))} allowClear={true} popupMatchSelectWidth={false} filterOption={(input, option) => {
                    if (!option?.label) return false;
                    const inputParts = input.toLowerCase().split(/\s+/).filter(Boolean);
                    const label = option.label.toLowerCase();
                    return inputParts.every(part => label.includes(part));
                }}/>
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
                <InputNumber min={0} step={1} style={{ width: '100%' }}/>
            </Form.Item>
        );
    case 'inputp0':
        return (
            <Form.Item key={field.name} label={field.label} name={field.name} rules={field.rules}>
                <InputNumber min={0} step={1} precision={0} style={{ width: '100%' }}/>
            </Form.Item>
        );
    case 'divider': 
        return <Divider key={field.label}>{field.label}</Divider>
    default:
        return null;
    }
}

export default renderField