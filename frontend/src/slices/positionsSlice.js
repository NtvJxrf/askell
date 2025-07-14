import { createSlice } from '@reduxjs/toolkit';

const positionsSlice = createSlice({
  name: 'positions',
  initialState: {
    positions: [],
    order: null,
    selectedPosition: null,
    triplexForGlasspacket: []
  },
  reducers: {
    addOrderPositions: (state, action) => {
      const nonAddedPositions = state.positions.filter( el => !el.added)
      state.positions = action.payload.concat(nonAddedPositions)
    },
    addNewPosition: (state, action) => { state.positions.push(action.payload)},
    addNewPositions: (state, action) => { state.positions = state.positions.concat(action.payload)},
    setPositions: (state, action) => { state.positions = action.payload},
    setOrder: (state, action) => { state.order = action.payload},
    setSelectedRowKeys: (state, action) => { state.selectedPosition = action.payload},
    addTriplexForGlasspacket: (state, action) => { state.triplexForGlasspacket.push(action.payload)},
    removeTriplexForGlasspacket: (state, action) => {
      state.triplexForGlasspacket = state.triplexForGlasspacket.filter(el => el.name != action.payload.name)
    },
  }
})

export const { addNewPosition, addOrderPositions, setPositions, setOrder, setSelectedRowKeys, addNewPositions, addTriplexForGlasspacket, removeTriplexForGlasspacket } = positionsSlice.actions;
export default positionsSlice.reducer;