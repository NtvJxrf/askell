import { createSlice } from '@reduxjs/toolkit';

const positionsSlice = createSlice({
  name: 'positions',
  initialState: {
    positions: [],
    order: null,
    selectedPosition: null
  },
  //                {
  //                   name: position.assortment.name,
  //                   price: position.price,
  //                   added: true,
  //                   quantity: position.quantity,
  //                    details: object
  //               }
  reducers: {
    addOrderPositions: (state, action) => {
      const nonAddedPositions = state.positions.filter( el => !el.added)
      state.positions = action.payload.concat(nonAddedPositions)
    },
    addNewPosition: (state, action) => { state.positions.push(action.payload)},
    setPositions: (state, action) => { state.positions = action.payload},
    setOrder: (state, action) => { state.order = action.payload},
    setSelectedRowKeys: (state, action) => { state.selectedPosition = action.payload},
  }
})

export const { addNewPosition, addOrderPositions, setPositions, setOrder, setSelectedRowKeys } = positionsSlice.actions;
export default positionsSlice.reducer;