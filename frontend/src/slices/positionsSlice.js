import { createSlice } from '@reduxjs/toolkit';

const positionsSlice = createSlice({
  name: 'positions',
  initialState: {
    positions: []
  },
  reducers: {
    addPosition: (state, action) => { state.positions.push(action.payload) }
  },
});

export const { addPosition, } = positionsSlice.actions;
export default positionsSlice.reducer;