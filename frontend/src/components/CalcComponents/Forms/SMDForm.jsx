import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import formConfigs from "./formConfig";
import store from '../../../store.js'
import renderField from './renderField.jsx'
const SMDForm = () => {
    return  <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {formConfigs.SMDForm.commonFields.map((item) => renderField(item))}
            </div>
}

export default SMDForm