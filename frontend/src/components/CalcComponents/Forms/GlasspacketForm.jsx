import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Button, List } from "antd";
import formConfigs from "../../../constants/formConfig.js";
import renderField from "./renderField.jsx";
import { addTriplexForGlasspacket, removeTriplexForGlasspacket } from '../../../slices/positionsSlice.js';
import TriplexFormModal from "../TriplexFormModal.jsx";

const filterWordsGlass = ["стекло"];
const filterWords = ["стекло"];
const gasArray = ["Аргон"];

const GlasspacketForm = () => {
  const materials = useSelector(state => state.selfcost.selfcost?.materials) || []
  const dispatch = useDispatch();
  const triplexForGlasspacket = useSelector(state => state.positions.triplexForGlasspacket);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const materialsArray = useMemo(() => {
    return Object.keys(materials)
      .filter(el => el.toLowerCase().includes('стекло'))
      .concat(triplexForGlasspacket.map(el => el.name))
      .sort();
  }, [materials, triplexForGlasspacket]);

  const planeArray = useMemo(() => {
    return Object.keys(materials)
      .filter(el => el.toLowerCase().includes('рамка'))
      .concat(triplexForGlasspacket.map(el => el.name))
      .sort();
  }, [materials, triplexForGlasspacket]);

  const glassFormFields = useMemo(() => {
    return formConfigs.glasspacketForm.commonFields.map(field => {
      if (field.name === "gas") return { ...field, options: gasArray };
      return field;
    });
  }, []);

  const materialColumns = useMemo(() => {
    return formConfigs.glasspacketForm.materialFields.map(group =>
      group.map(field => {
        if (field.name.startsWith("material")) return { ...field, options: materialsArray };
        if (field.name.startsWith("plane")) return { ...field, options: planeArray };
        return field;
      })
    );
  }, [materialsArray]);

  const handleDeleteTriplex = (item) => {
    dispatch(removeTriplexForGlasspacket(item));
  };

  const handleAddTriplex = () => {
    setIsModalOpen(true);
  };

  const handleModalSubmit = (newTriplex) => {
    dispatch(addTriplexForGlasspacket(newTriplex));
    setIsModalOpen(false);
  };

  return (
    <>
      <Row gutter={24} style={{ width: '100%' }}>
        <Col span={12} style={{ paddingLeft: 30 }}>
          <div style={{ maxWidth: 400, margin: "0 auto 40px" }}>
            {glassFormFields.map(item => (
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
                <List.Item
                  actions={[
                    <Button type="link" danger size="small" onClick={() => handleDeleteTriplex(item)}>
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
            <Button onClick={handleAddTriplex} size="medium" shape="round" style={{ maxWidth: 200 }}>
              Добавить триплекс
            </Button>
          </div>
        </Col>
      </Row>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, margin: '0 10px' }}>
        {(() => {
          const groups = [];

          for (let i = 0; i < materialColumns.length; i += 2) {
            const materialGroup = materialColumns[i] || [];
            const planeGroup = materialColumns[i + 1] || [];

            groups.push(
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Первая строка: Материал + чекбоксы */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  {materialGroup.map(field => (
                    <div key={field.name} style={{maxWidth: 600}}>
                      {renderField(field)}
                    </div>
                  ))}
                </div>

                {/* Вторая строка: Рамка */}
                <div style={{ display: 'flex', gap: 12 }}>
                  {planeGroup.map(field => (
                    <div key={field.name} >
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return groups;
        })()}
      </div>

      <TriplexFormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};

export default GlasspacketForm;
