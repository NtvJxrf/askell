import { createSlice } from '@reduxjs/toolkit';

const forms = createSlice({
  name: 'forms',
  initialState: {
    SMDForm: {},
    GlassForm: {},
    TriplexForm: {},
    CeraglassForm: {},
    GlassPacketForm: {},
  },
  reducers: {
    setFormData(state, action) {
      const { formType, values } = action.payload;
      state[formType] = values;
    },
    clearForm(state, action) {
      const formType = action.payload;
      state[formType] = {};
    }
  },
});

export const { setFormData, clearForm, setForm } = forms.actions;
export default forms.reducer;