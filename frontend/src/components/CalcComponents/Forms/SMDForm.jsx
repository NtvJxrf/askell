import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import formConfigs from "./formConfig";
import store from '../../../store.js'
import renderField from './renderField.jsx'
const SMDForm = () => {
    const colors = useSelector(state => state.selfcost.selfcost?.colors)
    if (!colors) return <div>Загрузка данных...</div>
    const colorsArray = Object.keys(colors).sort()
    formConfigs.SMDForm.commonFields[4].options = colorsArray
    return  <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {formConfigs.SMDForm.commonFields.map((item) => renderField(item))}
            </div>
}

export default SMDForm