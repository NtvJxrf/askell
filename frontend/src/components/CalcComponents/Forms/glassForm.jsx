import formConfigs from "./formConfig.js";
import renderField from './renderField.jsx';
import { useSelector } from "react-redux";
import { useMemo } from "react";

const excludedWords = ['пленка', 'плёнка', 'плита'];

const GlassForm = () => {
  const materials = useSelector(state => state.selfcost.selfcost?.materials) || [];
  const colors = useSelector(state => state.selfcost.selfcost?.colors) || [];

  const materialsArray = useMemo(() => {
    return Object.keys(materials)
      .filter(el => !excludedWords.some(word => el.toLowerCase().includes(word)))
      .sort();
  }, [materials]);

  const colorsArray = useMemo(() => Object.keys(colors).sort(), [colors]);

  const glassFormFields = useMemo(() => {
    return formConfigs.glassForm.commonFields.map(field => {
      if (field.name === 'material') {
        return { ...field, options: materialsArray };
      }
      if (field.name === 'color') {
        return { ...field, options: colorsArray };
      }
      return field;
    });
  }, [materialsArray, colorsArray]);

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {glassFormFields.map((item) => renderField(item))}
    </div>
  );
};

export default GlassForm;
