import { createSlice } from '@reduxjs/toolkit';

const forms = createSlice({
  name: 'forms',
  initialState: {
    SMDForm: {},
    glassForm: {},
    triplexForm: {},
    ceraglassForm: {},
    glassPacket: {}
  },
  reducers: {
    setForm(state, action) {
      const { formType, values } = action.payload;
      state[formType] = values;
    },
    clearForm(state, action) {
      const formType = action.payload;
      state[formType] = {};
    },
  },
});

export const { setForm, clearForm } = forms.actions;
export default forms.reducer;