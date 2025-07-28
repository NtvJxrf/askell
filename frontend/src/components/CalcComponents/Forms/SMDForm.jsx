import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import formConfigs from "../../../constants/formConfig.js";
import renderField from './renderField.jsx';

const SMDForm = () => {
  const colors = useSelector(state => state.selfcost.selfcost?.colors) || []

  const colorsArray = useMemo(() => {
    if (!colors) return [];
    return Object.keys(colors).sort();
  }, [colors]);

  const smdFormFields = useMemo(() => {
    return formConfigs.SMDForm.commonFields.map((field, index) => {
      if (field.name === 'color') return { ...field, options: colorsArray }
      return field;
    });
  }, [colorsArray]);

  if (!colorsArray.length) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {smdFormFields.map((item) => renderField(item))}
    </div>
  );
};

export default SMDForm;
