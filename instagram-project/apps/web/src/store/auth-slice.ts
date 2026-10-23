import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthStatus = 'unknown' | 'authenticated' | 'guest';

export interface AuthState {
  accessToken: string | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  accessToken: null,
  status: 'unknown',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    tokenReceived(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.status = 'authenticated';
    },
    signedOut(state) {
      state.accessToken = null;
      state.status = 'guest';
    },
  },
});

export const { tokenReceived, signedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
