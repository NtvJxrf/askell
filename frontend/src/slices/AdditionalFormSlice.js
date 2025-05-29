import { createSlice } from '@reduxjs/toolkit';

const additionalForm = createSlice({
  name: 'additionalForm',
  initialState: {
    additionalForm: {
                rounding: 'Округление до 0.5',
                customertype: 'Менее 200 тыс.',
                trim: 1.2
            }
  },
  reducers: {
    setForm(state, action) {
      state.additionalForm = action.payload
    }
  },
});

export const { setForm } = additionalForm.actions;
export default additionalForm.reducer;