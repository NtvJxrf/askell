import formConfigs from "./formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Form } from 'antd';

const triplexForm = ({ form }) => {

    const material1 = Form.useWatch('material1', form);
    const material2 = Form.useWatch('material2', form);
    const material3 = Form.useWatch('material3', form);

    formConfigs.triplexForm.materialFields[2].options = formConfigs.thicknessMap[material1] || [];
    formConfigs.triplexForm.materialFields[7].options = formConfigs.thicknessMap[material2] || [];
    formConfigs.triplexForm.materialFields[12].options = formConfigs.thicknessMap[material3] || [];

    return (
        <Row gutter={24} style={{ width: '100%' }}>
            <Col span={12} style={{ paddingLeft: 30 }}>
                {formConfigs.triplexForm.commonFields.map((item) => renderField(item))}
            </Col>
            <Col span={12}>
                {formConfigs.triplexForm.materialFields.map((item) => renderField(item))}
            </Col>
        </Row>
    );
};

export default triplexForm;