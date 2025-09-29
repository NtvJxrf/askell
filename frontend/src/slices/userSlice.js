import { createSlice } from '@reduxjs/toolkit';
import { version } from 'react';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
    isAuth: null,
    version: 0,
    lastUpdate: {}
  },
  reducers: {
    setUser: (state, action) => { state.user = action.payload },
    setIsAuth: (state, action) => { state.isAuth = action.payload },
    setVersion: (state, action) => { state.version = action.payload },
    setUpdate: (state, action) => { state.lastUpdate[action.payload.type] = action.payload.moment}
  },
});

export const { setUpdate, setUser, setIsAuth, setVersion } = userSlice.actions;
export default userSlice.reducer;