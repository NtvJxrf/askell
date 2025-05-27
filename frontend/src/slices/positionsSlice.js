import { createSlice } from '@reduxjs/toolkit';

const positionsSlice = createSlice({
  name: 'positions',
  initialState: {
    positions: [
  { key: '1', name: 'Очень большое и красиво стекло из М1', price: 12345, added: false },
  { key: '2', name: 'Самый прочный триплекс', price: 54321, added: false },
  { key: '3', name: 'Классный стол из керагласа', price: 98765, added: false },
]
  },
  reducers: {
    addPosition: (state, action) => { state.positions.push(action.payload) },
    setPositions: (state, action) => { state.positions = action.payload }
  },
  
});

export const { addPosition, setPositions } = positionsSlice.actions;
export default positionsSlice.reducer;