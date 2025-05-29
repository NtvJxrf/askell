// features/init/initSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initSlice = createSlice({
  name: 'selfcost',
  initialState: {
    selfcost: null,
  },
  reducers: {
    setSelfcost: (state, action) => {
      state.selfcost = action.payload;
    },
  },
});

export const { setSelfcost } = initSlice.actions;
export default initSlice.reducer;
