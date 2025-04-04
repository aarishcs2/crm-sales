import { TagsApi as BaseTagsApi } from "../base/tags";

interface Tags {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
}

interface NewTags {
  id?: string;
  name: string;
  color: string;
  //   countInStatistics: boolean;
  //   showInWorkspace: boolean;
}

interface UpdatedTags extends Partial<NewTags> {
  id: string;
}

export const TagsApi = BaseTagsApi.injectEndpoints({
  endpoints: (builder) => ({
    addTags: builder.mutation<Tags, { tagsData: NewTags; workspaceId: string }>(
      {
        query: ({ tagsData, workspaceId }) => ({
          url: `?action=createTags&workspaceId=${workspaceId}`,
          method: "POST",
          body: tagsData,
        }),
      }
    ),
    updateTags: builder.mutation<void, { id: any; updatedTags: any }>({
      query: ({ id, ...updatedTags }) => ({
        url: `?action=updateTags&id=${id}`,
        method: "PUT",
        body: updatedTags,
      }),
    }),

    getTags: builder.query<Tags, any>({
      query: (workspaceId) => ({
        url: `?action=getTags&workspaceId=${workspaceId}`,
        method: "GET",
      }),
    }),
    deleteTags: builder.mutation<void, { id: any; workspace_id: string }>({
      query: ({ id, workspace_id }) => ({
        url: `?action=deleteTags&id=${id}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useAddTagsMutation,
  useGetTagsQuery,
  useUpdateTagsMutation,
  useDeleteTagsMutation,
} = TagsApi;
