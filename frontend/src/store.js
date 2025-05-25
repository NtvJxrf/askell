import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../src/slices/userSlice.js';
import positionsReducer from './slices/positionsSlice.js'
import formsReducer from './slices/formSlice.js'
const store = configureStore({
  reducer: {
    user: userReducer,
    positions: positionsReducer,
    forms: formsReducer
  },
});
export default store