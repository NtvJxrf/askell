import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col } from "antd";
import formConfigs from "../../../constants/formConfig.js";
import renderField from "./renderField.jsx";

const filterWords = ["стекло", "зеркало"];
const gasArray = ["Аргон", "Криптон", "Воздух"];

const GlasspacketForm = () => {
  const materials = useSelector((state) => state.selfcost.selfcost?.materials) || {};

  const materialsArray = useMemo(() => {
    return Object.keys(materials)
      .filter((el) => filterWords.some((word) => el.toLowerCase().includes(word)))
      .sort();
  }, [materials]);

  const glassFormFields = useMemo(() => {
    return formConfigs.glasspacketForm.commonFields.map((field) => {
      if (field.name === "material") return { ...field, options: materialsArray }
      if (field.name === "gas") return { ...field, options: gasArray }
      return field;
    });
  }, [materialsArray, gasArray]);

  const materialColumns = useMemo(() => {
    return formConfigs.glasspacketForm.materialFields.map((group) =>
      group.map((field) => {
        if (field.type === "select") {
          return { ...field, options: materialsArray };
        }
        return field;
      })
    );
  }, [materialsArray]);

  return (
    <>
        <div style={{ maxWidth: 400, margin: "0 auto 40px" }}>
            {glassFormFields.map((item) => (
                <div key={item.name || item.label} style={{ marginBottom: 16 }}>
                    {renderField(item)}
                </div>
            ))}
        </div>
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
