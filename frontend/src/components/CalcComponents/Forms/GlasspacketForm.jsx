import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Form, Button, List } from "antd";
import formConfigs from "../../../constants/formConfig.js";
import renderField from "./renderField.jsx";
import {setTriplexForGlasspacket} from '../../../slices/positionsSlice.js' 
const filterWords = ["стекло", "зеркало"];
const gasArray = ["Аргон", "Криптон", "Воздух"];
const planeArray = ["Рамка 1", "Рамка 2", "Рамка 2"];
const GlasspacketForm = () => {
  const materials = useSelector(state => state.selfcost.selfcost?.materials) || {};
  const [form] = Form.useForm();
  const dispatch = useDispatch()
  const triplexForGlasspacket = useSelector(state => state.positions.triplexForGlasspacket)
  const materialsArray = useMemo(() => {
    return Object.keys(materials).concat(triplexForGlasspacket.map(el => el.name))
      .filter((el) => filterWords.some((word) => el.toLowerCase().includes(word)))
      .sort();
  }, [materials]);

  const glassFormFields = useMemo(() => {
    return formConfigs.glasspacketForm.commonFields.map((field) => {
      if (field.name === "gas") return { ...field, options: gasArray }
      return field;
    });
  }, [gasArray]);

  const materialColumns = useMemo(() => {
    return formConfigs.glasspacketForm.materialFields.map((group) =>
      group.map((field) => {
        if (field.name.startsWith("material")) return { ...field, options: materialsArray }
        if (field.name.startsWith('plane')) return { ...field, options: planeArray }
        return field;
      })
    );
  }, [materialsArray, planeArray]);

  const handleDeleteTriplex = (name) => {
    const updated = triplexForGlasspacket.filter(item => item.name !== name);
    dispatch(setTriplexForGlasspacket(updated));
  };

  const handleAddTriplex = () => {

  }

  return (
    <>
      <Row gutter={24} style={{ width: '100%' }}>
        <Col span={12} style={{ paddingLeft: 30 }}>
          <div style={{ maxWidth: 400, margin: "0 auto 40px" }}>
            {glassFormFields.map((item) => (
                <div key={item.name || item.label} style={{ marginBottom: 16 }}>
                    {renderField(item)}
                </div>
            ))}
          </div>
        </Col>
        <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingRight: 16 }}>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300, padding: '10px' }}>
            <List
              size="small"
              bordered
              dataSource={triplexForGlasspacket}
              locale={{ emptyText: "Нет триплексов" }}
              renderItem={(item) => (
                <List.Item actions={[
                    <Button type="link" danger size="small" onClick={() => handleDeleteTriplex(item.name)} >
                      Удалить
                    </Button>
                  ]}
                >
                  {item.name}
                </List.Item>
              )}
            />
          </div>
          <div style={{ margin: '0 0 30px 10px', display: 'flex', gap: 12, flexDirection: 'column', alignItems: 'center' }}>
            <Button onClick={handleAddTriplex} size="medium" shape="round" style={{maxWidth: 200}}>
              Добавить триплекс
            </Button>
          </div>
        </Col>
      </Row>
        <div style={{ display: 'flex', gap: 24, margin: '0 10px 0 10px'}}> 
            {materialColumns.map((column, colIndex) => (
                <div key={colIndex} style={{ flex: 1 }}>
                    {column.map((field) => (
                        <div key={field.name || field.label} style={{ marginBottom: 16 }}>
                            {renderField(field)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </>
  );
};
export default GlasspacketForm;
