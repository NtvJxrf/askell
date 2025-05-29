import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../src/slices/userSlice.js';
import positionsReducer from './slices/positionsSlice.js'
import formsReducer from './slices/formSlice.js'
import additionalFormReducer from './slices/AdditionalFormSlice.js'
import selfcostReduces from './slices/selfcostSlice.js'
const store = configureStore({
  reducer: {
    user: userReducer,
    positions: positionsReducer,
    forms: formsReducer,
    additionalForm: additionalFormReducer,
    selfcost: selfcostReduces
  },
});
export default store