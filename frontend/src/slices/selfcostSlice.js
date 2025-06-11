// features/init/initSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initSlice = createSlice({
  name: 'selfcost',
  initialState: {
    selfcost: null,
    pricesAndCoefs: null
  },
  reducers: {
    setSelfcost: (state, action) => {
      state.selfcost = action.payload;
    },
    setPricesAndCoefs: (state, action) => {
      state.pricesAndCoefs = action.payload;
    }
  },
});

export const { setSelfcost, setPricesAndCoefs } = initSlice.actions;
export default initSlice.reducer;
