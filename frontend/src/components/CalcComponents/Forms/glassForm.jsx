
import formConfigs from "./formConfig";
import renderField from './renderField.jsx'
import { Form } from 'antd'
import { useEffect } from 'react'
const glassForm = ({ form }) => {
    const type = Form.useWatch('type', form);
    const material = Form.useWatch('material', form)
    useEffect(() => {
        form.setFieldValue('material', undefined);
    }, [type]);

    useEffect(() => {
        form.setFieldValue('thickness', undefined);
    }, [material]);
    formConfigs.glassForm.commonFields[1].options = formConfigs.typeMap[type] || []
    formConfigs.glassForm.commonFields[2].options = formConfigs.thicknessMap[material] || []
    return  <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {formConfigs.glassForm.commonFields.map((item) => renderField(item))}
            </div>
}

export default glassForm