import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  token: string | null;
  session: string | null;
  user: {
    id: string;
    email: string;
    role: "admin" | "sales_agent" | "manager";
  } | null;
  expiresAt: number | null;
  lastActivity: number | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  session: null,
  expiresAt: null,
  lastActivity: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        user: AuthState["user"];
        expiresAt?: number;
      }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.lastActivity = Date.now();
      state.expiresAt = action.payload.expiresAt || null;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.session = null;
      state.expiresAt = null;
      state.lastActivity = null;
      state.isAuthenticated = false;
    },
    signup(
      state,
      action: PayloadAction<{
        token: string;
        user: AuthState["user"];
        expiresAt?: number;
      }>
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.lastActivity = Date.now();
      state.expiresAt = action.payload.expiresAt || null;
      state.isAuthenticated = true;
    },
    signin(
      state,
      action: PayloadAction<{
        token: string;
        user: AuthState["user"];
        session: string;
        expiresAt?: number;
      }>
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.lastActivity = Date.now();
      state.expiresAt = action.payload.expiresAt || null;
      state.isAuthenticated = true;
    },
    verify(state, action: PayloadAction<{ token: string; expiresAt?: number }>) {
      state.token = action.payload.token;
      state.lastActivity = Date.now();
      state.expiresAt = action.payload.expiresAt || null;
      state.isAuthenticated = true;
    },
    updateActivity(state) {
      state.lastActivity = Date.now();
    },
  },
});

export const { setCredentials, logout, signup, signin, verify, updateActivity } =
  authSlice.actions;
export default authSlice.reducer;
