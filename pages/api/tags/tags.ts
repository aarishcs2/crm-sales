import { NextApiRequest, NextApiResponse } from "next";
import { AUTH_MESSAGES } from "@/lib/constant/auth";
import { supabase } from "../../../lib/supabaseServer";

interface TagsRequest {
  [key: string]: string;
}

interface UpdatedTagsRequest extends Partial<TagsRequest> {
  id: string; 
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, body, query, headers } = req;
  const action = query.action as string;

  if (!action) {
    return res.status(400).json({ error: AUTH_MESSAGES.API_ERROR });
  }

  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: AUTH_MESSAGES.UNAUTHORIZED });
  }

  const token = authHeader.split(" ")[1];

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return res.status(401).json({ error: AUTH_MESSAGES.UNAUTHORIZED });
  }

  switch (method) {
    case "POST": {
      if (action === "createTags") {
        const { workspaceId } = query;
        const { name, color, countInStatistics, showInWorkspace } = body;
        if (
          !name ||
          !workspaceId ||
          !color
          // typeof countInStatistics === "undefined" ||
          // typeof showInWorkspace === "undefined"
        ) {
          return res.status(400).json({ error: AUTH_MESSAGES.API_ERROR });
        }

        try {
          // Fetch the workspace details to verify ownership or membership
          const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", workspaceId)
            .single(); // Expect only one workspace

          if (workspaceError) {
            return res.status(500).json({ error: workspaceError.message });
          }

          if (!workspace) {
            return res.status(404).json({ error: "Workspace not found" });
          }

          // Check if the user is the owner
          if (workspace.owner_id !== user.id) {
            // If not the owner, check if the user is a member
            const { data: membership, error: membershipError } = await supabase
              .from("workspace_members")
              .select("*")
              .eq("workspace_id", workspaceId)
              .eq("user_id", user.id)
              .single(); // Expect only one match

            if (membershipError) {
              return res.status(500).json({ error: membershipError.message });
            }

            if (!membership) {
              return res
                .status(403)
                .json({ error: AUTH_MESSAGES.UNAUTHORIZED });
            }
          }
          // Insert status into the database
          // const { data, error } = await supabase.from("tags").insert({
          //   name,
          //   color,
          //   // count_statistics: countInStatistics,
          //   // workspace_show: showInWorkspace,
          //   work_id: workspaceId,
          //   user_id: user.id,
          // });

          // if (error) {
          //   return res.status(400).json({ error });
          // }
          const { data, error } = await supabase
            .from("tags")
            .insert({
              name,
              color,
              work_id: workspaceId,
              user_id: user.id,
            })
            .select(); // Try adding .select() to return the inserted data

          if (error) {
            console.error("Supabase Insert Error:", error);
            return res.status(400).json({ error });
          }

          return res.status(200).json({ data });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: "An error occurred" });
        }
      }
      return res.status(400).json({ error: AUTH_MESSAGES.API_ERROR });
    }

    case "GET": {
      if (action === "getTags") {
        const { workspaceId } = query;

        if (!workspaceId) {
          return res.status(400).json({ error: AUTH_MESSAGES.API_ERROR });
        }

        try {
          // Fetch the workspace details to verify ownership or membership
          const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", workspaceId)
            .single(); // Expect only one workspace

          if (workspaceError) {
            return res.status(500).json({ error: workspaceError.message });
          }

          if (!workspace) {
            return res.status(404).json({ error: "Workspace not found" });
          }

          // Check if the user is the owner
          if (workspace.owner_id !== user.id) {
            // If not the owner, check if the user is a member
            const { data: membership, error: membershipError } = await supabase
              .from("workspace_members")
              .select("*")
              .eq("workspace_id", workspaceId)
              .eq("user_id", user.id)
              .single(); // Expect only one match

            if (membershipError) {
              return res.status(500).json({ error: membershipError.message });
            }

            if (!membership) {
              return res
                .status(403)
                .json({ error: AUTH_MESSAGES.UNAUTHORIZED });
            }
          }

          // Retrieve statuses from the database
          const { data, error } = await supabase
            .from("tags")
            .select("*")
            .eq("work_id", workspaceId); // Only filter by workspace ID as the user is already authorized

          if (error) {
            return res.status(400).json({ error: error.message });
          }

          return res.status(200).json({ data });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: "An error occurred" });
        }
      }

      return res.status(400).json({ error: AUTH_MESSAGES.API_ERROR });
    }
    case "PUT": {
      if (action === "updateTags") {
        const { id } = query as any;

        if (!id) {
          return res.status(400).json({ error: "Tags ID is required" });
        }

        try {
          const { id } = query as any;
          const { updatedTags }: any = body;
          const { name, color, count_statistics }: UpdatedTagsRequest =
            updatedTags;
          const {
            data: { user },
          } = await supabase.auth.getUser(token);

          if (!user) {
            return res.status(401).json({ error: AUTH_MESSAGES.UNAUTHORIZED });
          }

          // First, get the status and its workspace_id
          const { data: tagsData, error: tagsError } = await supabase
            .from("tags")
            .select("*, work_id")
            .eq("id", id)
            .single();

          if (tagsError || !tagsData) {
            return res.status(404).json({ error: "Tags not found" });
          }

          // If we reach here, user is either the owner or an admin
          const { data, error } = await supabase
            .from("tags")
            .update({
              color: color,
              name: name,
              count_statistics: count_statistics,
            })
            .eq("id", id)
            .select();

          if (error) {
            console.error("Update error:", error);
            return res.status(400).json({ error: error.message });
          }

          return res
            .status(200)
            .json({ message: "Tags updated successfully", data });
        } catch (error) {
          console.error("Unexpected error:", error);
          return res
            .status(500)
            .json({ error: "An unexpected error occurred" });
        }
      }

      return res.status(400).json({ error: "Invalid action" });
    }

    case "DELETE": {
      if (action === "deleteTags") {
        const { id } = query;

        if (!id) {
          return res.status(400).json({ error: "Tags ID is required" });
        }

        try {
          // First, get the status and its workspace_id
          const { data: tagsData, error: tagsError } = await supabase
            .from("tags")
            .select("*, work_id")
            .eq("id", id)
            .single();

          if (tagsError || !tagsData) {
            return res.status(404).json({ error: "Tags not found" });
          }

          // Get workspace details to check ownership
          const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .select("owner_id")
            .eq("id", tagsData.work_id)
            .single();

          if (workspaceError) {
            return res.status(500).json({ error: workspaceError.message });
          }

          // Check if user is workspace owner
          const isOwner = workspace.owner_id === user.id;

          if (!isOwner) {
            // If not owner, check if user is a workspace member
            const { data: membership, error: membershipError } = await supabase
              .from("workspace_members")
              .select("role")
              .eq("workspace_id", tagsData.work_id)
              .eq("user_id", user.id)
              .single();

            if (membershipError || !membership) {
              return res.status(403).json({
                error: "You must be a workspace member or owner to delete tags",
              });
            }
          }

          // Proceed with deletion
          const { error: deleteError } = await supabase
            .from("tags")
            .delete()
            .eq("id", id);

          if (deleteError) {
            return res.status(400).json({ error: deleteError.message });
          }

          return res.status(200).json({
            message: "Tags deleted successfully",
          });
        } catch (error) {
          console.error("Unexpected error:", error);
          return res.status(500).json({
            error: "An unexpected error occurred",
          });
        }
      }
      return res.status(400).json({ error: AUTH_MESSAGES.API_ERROR });
    }

    default:
      return res.status(405).json({ error: AUTH_MESSAGES.API_ERROR });
  }
}
