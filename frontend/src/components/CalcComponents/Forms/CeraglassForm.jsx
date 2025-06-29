import { useSelector } from "react-redux";
import formConfigs from "../../../constants/formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Form } from 'antd';
const excludedWords = ['пленка', 'плёнка'];
const ceraExcludedWords = ['пленка', 'плёнка', 'стекло', 'зеркало']
const CeraglassForm = () => {
    const materials = useSelector(state => state.selfcost.selfcost.materials)
    const unders = useSelector(state => state.selfcost.selfcost.unders)
    const colors = useSelector(state => state.selfcost.selfcost.colors)
    const undersArray = Object.keys(unders)
    const colorsArray = Object.keys(colors)
    const ceraArray = Object.keys(materials).filter(el => !ceraExcludedWords.some(word => el.toLowerCase().includes(word))).sort();
    const materialsArray = Object.keys(materials).filter(el => !excludedWords.some(word => el.toLowerCase().includes(word))).sort();

    formConfigs.ceraglassForm.commonFields[0].options = ceraArray
    formConfigs.ceraglassForm.commonFields[1].options = materialsArray
    formConfigs.ceraglassForm.commonFields[8].options = colorsArray
    formConfigs.ceraglassForm.commonFields[9].options = undersArray
    return (
        <Row gutter={24} style={{ width: '100%' }}>
            <Col span={12} style={{ paddingLeft: 30 }}>
                {formConfigs.ceraglassForm.commonFields.map((item) => renderField(item))}
            </Col>
            <Col span={12}>
                {formConfigs.ceraglassForm.materialFields.map((item) => renderField(item))}
            </Col>
        </Row>
    );
};

export default CeraglassForm;