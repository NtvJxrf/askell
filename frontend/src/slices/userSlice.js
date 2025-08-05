import { createSlice } from '@reduxjs/toolkit';
import { version } from 'react';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
    isAuth: null,
    version: 0
  },
  reducers: {
    setUser: (state, action) => { state.user = action.payload },
    setIsAuth: (state, action) => { state.isAuth = action.payload },
    setVersion: (state, action) => { state.version = action.payload },
  },
});

export const { setUser, setIsAuth, setVersion } = userSlice.actions;
export default userSlice.reducer;