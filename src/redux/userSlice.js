// Purpose: Redux state slice/store setup for user slice data.
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    userId: localStorage.getItem('userId') || null,
    role: localStorage.getItem('role') || null,
  },
  reducers: {
    setUser: (state, action) => {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      localStorage.setItem('userId', action.payload.userId);
      localStorage.setItem('role', action.payload.role);
    },
    clearUser: (state) => {
      state.userId = null;
      state.role = null;
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
