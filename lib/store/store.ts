import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { api } from "./base/authapi";
import { leadsApi } from "./base/leadsapi";
import { membersApi } from "./base/members";
import { statusApi } from "./base/status";
import { TagsApi } from "./base/tags";
import { webhookApi } from "./base/webhooks";
import { workspaceApi } from "./base/workspace";
import authReducer from "./slices/authSlice";
import sidebarReducer from "./slices/sideBar";
export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    [webhookApi.reducerPath]: webhookApi.reducer,
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [leadsApi.reducerPath]: leadsApi.reducer,
    [statusApi.reducerPath]: statusApi.reducer,
    [TagsApi.reducerPath]: TagsApi.reducer,

    [membersApi.reducerPath]: membersApi.reducer,
    auth: authReducer,
    sidebar: sidebarReducer,
    // leads: leadsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)
      .concat(webhookApi.middleware)
      .concat(workspaceApi.middleware)
      .concat(leadsApi.middleware)
      .concat(statusApi.middleware)
      .concat(TagsApi.middleware)
      .concat(membersApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
