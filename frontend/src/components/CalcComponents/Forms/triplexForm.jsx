import { useSelector } from "react-redux";
import formConfigs from "./formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Form } from 'antd';

const TriplexForm = () => {
    const materials = useSelector(state => state.selfcost.selfcost.materials)
    const materialsArray = Object.keys(materials).sort()
    formConfigs.triplexForm.materialFields[1].options = materialsArray
    formConfigs.triplexForm.materialFields[5].options = materialsArray
    formConfigs.triplexForm.materialFields[9].options = materialsArray

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

export default TriplexForm;