import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
    isAuth: null,
  },
  reducers: {
    setUser: (state, action) => { state.user = action.payload },
    setIsAuth: (state, action) => { state.isAuth = action.payload },

  },
});

export const { setUser, setIsAuth } = userSlice.actions;
export default userSlice.reducer;