import { createSlice } from '@reduxjs/toolkit';

const positionsSlice = createSlice({
  name: 'positions',
  initialState: {
    positions: [],
    order: null,
    selectedPosition: null,
    triplexForGlasspacket: [],
    productionLoad: { kriv: [], pryam: [], other: [], straightTotal: 0, curvedTotal: 0, drillsTotal: 0, cuttingTotal: 0, temperingTotal: 0, triplexTotal: 0, viz: 0, selk: 0},
    displayPrice: 'retailPrice'
  },
  reducers: {
    addOrderPositions: (state, action) => {
      const nonAddedPositions = state.positions.filter( el => !el.added)
      state.positions = action.payload.concat(nonAddedPositions)
    },
    addNewPosition: (state, action) => { state.positions.push(action.payload) },
    addNewPositions: (state, action) => { state.positions = state.positions.concat(action.payload) },
    setPositions: (state, action) => { state.positions = action.payload },
    setOrder: (state, action) => { state.order = action.payload },
    setSelectedRowKeys: (state, action) => { state.selectedPosition = action.payload },
    addTriplexForGlasspacket: (state, action) => { state.triplexForGlasspacket.push(action.payload) },
    removeTriplexForGlasspacket: (state, action) => {
      state.triplexForGlasspacket = state.triplexForGlasspacket.filter(el => el.name != action.payload.name)
    },
    setProductionLoad: (state, action) => { state.productionLoad = action.payload },
    setDisplayPrice: (state, action) => { state.displayPrice = action.payload }
  }
})

export const { setDisplayPrice, setProductionLoad, addNewPosition, addOrderPositions, setPositions, setOrder, setSelectedRowKeys, addNewPositions, addTriplexForGlasspacket, removeTriplexForGlasspacket } = positionsSlice.actions;
export default positionsSlice.reducer;