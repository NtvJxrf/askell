import formConfigs from "./formConfig.js";
import renderField from './renderField.jsx';
import { Form } from 'antd';
import { useSelector } from "react-redux";
const excludedWords = ['пленка', 'плёнка', 'плита'];
const GlassForm = ({ form }) => {
    const materials = useSelector(state => state.selfcost.selfcost.materials)
    const colors = useSelector(state => state.selfcost.selfcost.colors)
    const materialsArray = Object.keys(materials).filter(el => !excludedWords.some(word => el.toLowerCase().includes(word))).sort();
    const colorsArray = Object.keys(colors).sort()
    formConfigs.glassForm.commonFields[0].options = materialsArray
    formConfigs.glassForm.commonFields[8].options = colorsArray
    return (
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
            {formConfigs.glassForm.commonFields.map((item) => renderField(item))}
        </div>
    );
};

export default GlassForm;
