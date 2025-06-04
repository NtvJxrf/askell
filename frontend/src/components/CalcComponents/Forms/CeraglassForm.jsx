import { useSelector } from "react-redux";
import formConfigs from "./formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Form } from 'antd';
const excludedWords = ['пленка', 'плёнка'];
const CeraglassForm = () => {
    const materials = useSelector(state => state.selfcost.selfcost.materials)
    const unders = useSelector(state => state.selfcost.selfcost.unders)
    const undersArray = Object.keys(unders)
    const materialsArray = Object.keys(materials).filter(el => !excludedWords.some(word => el.toLowerCase().includes(word))).sort();
    formConfigs.ceraglassForm.materialFields[1].options = materialsArray
    formConfigs.ceraglassForm.materialFields[3].options = materialsArray
    formConfigs.ceraglassForm.commonFields[6].options = undersArray
    return (
        <Row gutter={24} style={{ width: '100%' }}>
            <Col span={10} style={{ paddingLeft: 30 }}>
                {formConfigs.ceraglassForm.commonFields.map((item) => renderField(item))}
            </Col>
            <Col span={14}>
                {formConfigs.ceraglassForm.materialFields.map((item) => renderField(item))}
            </Col>
        </Row>
    );
};

export default CeraglassForm;