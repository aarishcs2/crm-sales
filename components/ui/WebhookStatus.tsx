import React, { useState, useEffect } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetWebhooksBySourceIdQuery,
  useUpdateWebhookMutation,
} from "@/lib/store/services/webhooks";

interface WebhookStatusProps {
  sourceId: string | null;
  workspaceId: string;
}

const WebhookStatus: React.FC<WebhookStatusProps> = ({
  sourceId,
  workspaceId,
}) => {
  const {
    data: webhooks,
    isLoading,
    isError,
  } = useGetWebhooksBySourceIdQuery(
    sourceId && workspaceId ? { id: sourceId, workspaceId } : skipToken
  );

  const [updateWebhook] = useUpdateWebhookMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");

  // Sync state when API fetches data
  useEffect(() => {
    if (webhooks?.type) {
      setSelectedType(webhooks.type.toLowerCase());
    }
  }, [webhooks]);

  // Manually defined webhook platform options
  const platformOptions = ["Google", "Shopify", "WordPress", "Landing Page"];

  // Define background colors for platforms
  const typeColors: Record<string, string> = {
    google: "bg-blue-500 text-white dark:bg-blue-400",
    shopify: "bg-green-500 text-white dark:bg-green-400",
    wordpress: "bg-purple-500 text-white dark:bg-purple-400",
    other: "bg-gray-500 text-white dark:bg-gray-400",
  };

  const typeClass = typeColors[selectedType] || typeColors.other;

  const handleUpdate = async (newType: string) => {
    if (!sourceId) return;
    try {
      await updateWebhook({
        id: webhooks?.id,
        data: { type: newType },
      }).unwrap();
      setSelectedType(newType); // Update local state
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating platform:", error);
    }
  };

  return (
    <div className="py-3 relative">
      {isEditing ? (
        <select
          className="md:px-3 px-1 py-1 border rounded-md cursor-pointer w-full bg-white dark:bg-gray-800"
          value={selectedType}
          onChange={(e) => handleUpdate(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
        >
          {platformOptions.map((option) => (
            <option
              key={option}
              value={option.toLowerCase()}
              className="px-3 py-1 rounded-md"
              // className={`px-3 py-1 rounded-md text-sm font-semibold ${typeClass} cursor-pointer`}
            >
              {option}
            </option>
          ))}
        </select>
      ) : (
        <span
          className={`px-3 py-1 rounded-md text-sm font-semibold ${typeClass} cursor-pointer`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {selectedType
            ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1)
            : "No Platform"}
        </span>
      )}
    </div>
  );
};

export default WebhookStatus;
