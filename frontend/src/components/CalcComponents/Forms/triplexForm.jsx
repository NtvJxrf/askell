import formConfigs from "./formConfig";
import renderField from './renderField.jsx';
import { Row, Col, Form } from 'antd';

const triplexForm = ({ form }) => {

    const type = Form.useWatch('type', form);
    const material1 = Form.useWatch('material1', form);
    const material2 = Form.useWatch('material2', form);
    const material3 = Form.useWatch('material3', form);

    formConfigs.triplexForm.materialFields[1].options = formConfigs.typeMap[type] || [];
    formConfigs.triplexForm.materialFields[6].options = formConfigs.typeMap[type] || [];
    formConfigs.triplexForm.materialFields[11].options = formConfigs.typeMap[type] || [];

    formConfigs.triplexForm.materialFields[2].options = formConfigs.thicknessMap[material1] || [];
    formConfigs.triplexForm.materialFields[7].options = formConfigs.thicknessMap[material2] || [];
    formConfigs.triplexForm.materialFields[12].options = formConfigs.thicknessMap[material3] || [];

    formConfigs.triplexForm.materialFields[4].options = formConfigs.tapeMap[type] || [];
    formConfigs.triplexForm.materialFields[9].options = formConfigs.tapeMap[type] || [];
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