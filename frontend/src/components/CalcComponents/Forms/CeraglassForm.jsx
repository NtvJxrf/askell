import { useSelector } from "react-redux";
import formConfigs from "../../../constants/formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Button } from 'antd';
import { useMemo, useState, useRef } from "react";

const glassAndCera = ['стекло', 'плита'];
const ceraExcludedWords = ['плита']
const CeraglassForm = () => {
    const materials = useSelector(state => state.selfcost.selfcost?.materials) || []
    const unders = useSelector(state => state.selfcost.selfcost?.unders) || []
    const colors = useSelector(state => state.selfcost.selfcost?.colors) || []
    const undersArray = Object.keys(unders)
    const colorsArray = Object.keys(colors)
    const ceraArray = Object.keys(materials).filter(el => ceraExcludedWords.some(word => el.toLowerCase().includes(word))).sort();
    const materialsArray = Object.keys(materials).filter(el => glassAndCera.some(word => el.toLowerCase().includes(word))).sort();
    const ceraglassFields = useMemo(() => {
        return formConfigs.ceraglassForm.commonFields.map(field => {
        if (field.name === 'material1') return { ...field, options: ceraArray };
        if (field.name === 'color') return { ...field, options: colorsArray };
        if (field.name === 'under') return { ...field, options: undersArray };
        if (field.name === 'material2') return { ...field, options: materialsArray };
        return field;
        });
    }, [materialsArray, colorsArray, undersArray, ceraArray]);



    const [additionalMaterials, setAdditionalMaterials] = useState([]);
    const materialCount = useRef(0);

    const addMaterial = () => {
        setAdditionalMaterials(prev => [
            ...prev,
            { id: `Деталь${materialCount.current + 1}`, label: `Деталь ${materialCount.current + 1}`, type: 'divider' },
            { id: `height${materialCount.current + 1}`, name: `height${materialCount.current + 1}`, type: 'input', label: `Высота ${materialCount.current + 1}` },
            { id: `width${materialCount.current + 1}`, name: `width${materialCount.current + 1}`, type: 'input', label: `Ширина ${materialCount.current + 1}` },
        ]);
        materialCount.current++;
    };
    
    const removeMaterial = () => {
        setAdditionalMaterials(prev => {
            if (prev.length === 0) return prev
            return prev.slice(0, -3);
        });
        if (materialCount.current > 0) {
            materialCount.current--;
        }
    };


    return (
        <Row gutter={24} style={{ width: '100%' }}>
            <Col span={12} style={{ paddingLeft: 30 }}>
                {ceraglassFields.map((item) => renderField(item))}
            </Col>
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', height: '400px', paddingRight: 16 }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                {additionalMaterials.map(item => (
                    <div key={item.id}>
                    {renderField(item)}
                    </div>
                ))}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 12, flexDirection: 'column' }}>
                <Button onClick={addMaterial} size="medium" shape="round" block>
                    Добавить
                </Button>
                <Button onClick={removeMaterial} size="medium" shape="round" block danger>
                    Удалить
                </Button>
                </div>
            </Col>
        </Row>
    );
};

export default CeraglassForm;