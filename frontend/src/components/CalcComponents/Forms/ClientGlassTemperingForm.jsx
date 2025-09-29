import formConfigs from "../../../constants/formConfig.js";
import renderField from './renderField.jsx';
import { useMemo } from "react";

const ClientGlassTemperingForm = () => {
  const glassFormFields = useMemo(() => {
    return formConfigs.ClientGlassTempering.commonFields;
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {glassFormFields.map((item) => renderField(item))}
    </div>
  );
};

export default ClientGlassTemperingForm;
