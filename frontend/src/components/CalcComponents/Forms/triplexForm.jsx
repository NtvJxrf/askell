import formConfigs from "./formConfig";
import renderField from './renderField.jsx'
const triplexForm = () => {
    return  <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {formConfigs.SMDForm.commonFields.map((item) => renderField(item))}
            </div>
}

export default triplexForm