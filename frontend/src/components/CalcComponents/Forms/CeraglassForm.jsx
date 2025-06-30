import { useSelector } from "react-redux";
import formConfigs from "../../../constants/formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Form } from 'antd';
import { useMemo } from "react";

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
    const ceraglassFields = useMemo(() => {
        return formConfigs.ceraglassForm.commonFields.map(field => {
        if (field.name === 'material1') return { ...field, options: ceraArray };
        if (field.name === 'color') return { ...field, options: colorsArray };
        if (field.name === 'under') return { ...field, options: undersArray };
        if (field.name === 'material2') return { ...field, options: materialsArray };
        return field;
        });
    }, [materialsArray, colorsArray, undersArray, ceraArray]);
    return (
        <Row gutter={24} style={{ width: '100%' }}>
            <Col span={12} style={{ paddingLeft: 30 }}>
                {ceraglassFields.map((item) => renderField(item))}
            </Col>
            <Col span={12}>
                {formConfigs.ceraglassForm.materialFields.map((item) => renderField(item))}
            </Col>
        </Row>
    );
};

export default CeraglassForm;