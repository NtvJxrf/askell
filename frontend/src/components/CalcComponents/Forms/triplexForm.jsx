import { useSelector } from "react-redux";
import formConfigs from "../../../constants/formConfig.js";
import renderField from './renderField.jsx';
import { Row, Col, Button } from 'antd';
import { useState, useRef, useMemo } from "react";

const filterWords = ['стекло', 'зеркало'];
const tapesArray = ['Пленка EVA №25 Хамелеон Гладкий 1.4', 'Смарт пленка Magic Glass', 'Смарт-пленка белая (для Триплекса)', 'плёнка ORACAL 641-OOM 1.26x50ru', 'Пленка Boneva FORCE 0.76', 'Пленка EVA Orange (Оранжевая) 0,38 мм', 'Пленка EVA №1 Black Черная', 'Пленка EvoLam 0,38мм  2,1х50 м (Blue T (синяя))', 'Пленка EVA №2 White (БЕЛАЯ)-MILK(молоко)', 'Пленка EVA Green (зелёный) 0,38мм', 'Пленка EVA Bronze (бронза) 0,38мм', 'пленка EVA №6 Серая непрозрачная', 'Пленка EVA Super White (насыщенно белая) 0,38мм', 'Пленка EVA Black (чёрная) 0,38мм', 'Пленка EVA yellow (желтый) 0,38мм', 'Пленка EVA №7 Бежевая непрозрачная', 'Пленка EVA sapphire (сапфир) 0,38мм', 'Пленка EVA White (белая) 0,38мм', 'пленка EVA №3 FS (САТИН)', 'Пленка EVA Grey (серая) 0,38мм', 'Пленка EVA №24 черная прозрачная- Dark Grey (темно-серая)']

const TriplexForm = () => {
  const materials = useSelector(state => state.selfcost.selfcost?.materials) || []
  const colors = useSelector(state => state.selfcost.selfcost?.colors) || [];
  const materialsArray = useMemo(() => {
      return Object.keys(materials)
        .filter(el => filterWords.some(word => el.toLowerCase().includes(word)))
        .sort();
    }, [materials]);
  const colorsArray = useMemo(() => Object.keys(colors).sort(), [colors]);
  const triplexFormFields = useMemo(() => {
    return formConfigs.triplexForm.materialFields.map((field) => {
      if (field?.name?.startsWith("material")) return { ...field, options: materialsArray }
      return field;
    });
  }, [materialsArray]);

  const triplexCommonFields = useMemo(() => {
    return formConfigs.triplexForm.commonFields.map((field) => {
      if (field?.name?.startsWith("color")) return { ...field, options: colorsArray }
      return field;
    });
  }, [colorsArray]);

  const [additionalMaterials, setAdditionalMaterials] = useState([]);
  const materialCount = useRef(3);

  const addMaterial = () => {
    setAdditionalMaterials(prev => [
      ...prev,
      { id: `Пленка ${materialCount.current - 1}`, label: `Пленка ${materialCount.current - 1}`, type: 'divider' },
      {
        id: `tape${materialCount.current - 1}`,
        name: `tape${materialCount.current - 1}`,
        label: 'Пленка',
        type: 'select',
        options: tapesArray,
      },
      { id:`Материал ${materialCount.current}`, label: `Материал ${materialCount.current}`, type: 'divider' },
      {
        id: `material${materialCount.current}`,
        name: `material${materialCount.current}`,
        label: 'Материал',
        type: 'select',
        options: materialsArray,
        rules: [{ required: true, message: 'Заполните поле' }]
      },
    ]);
    materialCount.current++;
  };

  const removeMaterial = () => {
    setAdditionalMaterials(prev => {
      if (prev.length === 0) return prev
      return prev.slice(0, -4);
    });
    if (materialCount.current > 3) {
      materialCount.current--;
    }
  };

  return (
    <Row gutter={24} style={{ width: '100%' }}>
      <Col span={12} style={{ paddingLeft: 30 }}>
        {triplexCommonFields.map(item => renderField(item))}
      </Col>
      <Col span={12} style={{ display: 'flex', flexDirection: 'column', height: '500px', paddingRight: 16 }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {triplexFormFields.map(item => renderField(item))}
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

export default TriplexForm;