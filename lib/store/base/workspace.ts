import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";

export const workspaceApi = createApi({
  reducerPath: "/api/workspace/",
  baseQuery: optimizedFetchBaseQuery("/api/workspace/workspace"),
  endpoints: () => ({}),
  keepUnusedDataFor: CACHE_DURATIONS.LONG, // Workspace data changes infrequently
  refetchOnReconnect: true,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: false,
});
