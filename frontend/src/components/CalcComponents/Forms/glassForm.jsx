import formConfigs from "./formConfig.js";
import renderField from './renderField.jsx';
import { Form } from 'antd';

const GlassForm = ({ form }) => {
    const type = Form.useWatch('type', form);
    const material = Form.useWatch('material', form);

    formConfigs.glassForm.commonFields[1].options = formConfigs.typeMap[type] || [];
    formConfigs.glassForm.commonFields[2].options = formConfigs.thicknessMap[material] || [];

    return (
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
            {formConfigs.glassForm.commonFields.map((item) => renderField(item))}
        </div>
    );
};

export default GlassForm;
