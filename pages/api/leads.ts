import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseServer";
import Together from "together-ai";

// Initialize Together AI client
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

const SYSTEM_PROMPT = `You are a JSON formatter. Format the input data into a JSON object. ONLY OUTPUT THE JSON OBJECT, NO OTHER TEXT.

Format Rules:
1. Extract name parts to first_name and last_name
2. Clean phone to digits and + only
3. Email to lowercase
4. Unknown fields go to custom_data
5. Output format:
{
  "name": "",
  "email": "",
  "phone": "",
  "message": "",
  "custom_data": {}
}

If you see a full name, split it into first_name and last_name.
If you see a phone number, clean it to only include digits and +.
Move any unrecognized fields into custom_data.`;

// Normalize any input data to a string
const normalizeInput = (data: any): string => {
  if (data === null || data === undefined) {
    return "";
  }

  try {
    if (typeof data === "string") {
      return data;
    }
    return JSON.stringify(data);
  } catch (e) {
    return String(data);
  }
};

// Basic validation of lead data
const isValidLead = (data: any): boolean => {
  if (!data) return false;

  // Check if we have at least a name or phone
  const hasName =
    data.first_name || (data.custom_data && data.custom_data.name);
  const hasPhone = data.phone || (data.custom_data && data.custom_data.phone);

  return Boolean(hasName || hasPhone);
};

// Process data with Together AI
async function processWithAI(inputData: any) {
  try {
    const normalizedInput = normalizeInput(inputData);
    let formattedResponse = "";

    const response = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: normalizedInput,
        },
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      temperature: 0,
      top_p: 1,
      top_k: 1,
      max_tokens: 500,
      stream: true,
    });

    for await (const token of response) {
      if (token.choices[0]?.delta?.content) {
        formattedResponse += token.choices[0].delta.content;
      }
    }

    // Find the JSON object in the response
    const match = formattedResponse.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("No JSON found in AI response");
    }

    return JSON.parse(match[0]);
  } catch (error) {
    console.error("AI processing error:", error);
    throw error;
  }
}

// Fallback processing if AI fails
function fallbackProcess(data: any) {
  const processed: any = {
    name: "",
    email: "",
    phone: "",
    message: "",
    custom_data: {},
  };

  try {
    // If data is a string, try to parse it as JSON
    const inputData = typeof data === "string" ? JSON.parse(data) : data;

    // Handle array format
    if (Array.isArray(inputData)) {
      inputData.forEach((field) => {
        const value = String(field.value || "").trim();
        const name = String(field.name || "").toLowerCase();

        if (name.includes("name")) {
          const names = value.split(" ");
          processed.first_name = names[0] || "";
          processed.last_name = names.slice(1).join(" ") || "";
        } else if (name.includes("phone")) {
          processed.phone = value.replace(/[^0-9+]/g, "");
        } else if (name.includes("email")) {
          processed.email = value.toLowerCase();
        } else if (name.includes("message") || name.includes("comment")) {
          processed.message = value;
        } else {
          processed.custom_data[name] = value;
        }
      });
    }
    // Handle object format
    else if (typeof inputData === "object") {
      Object.entries(inputData).forEach(([key, value]) => {
        const processedValue = String(value || "").trim();
        const processedKey = key.toLowerCase();

        if (processedKey.includes("name")) {
          const names = processedValue.split(" ");
          processed.first_name = names[0] || "";
          processed.last_name = names.slice(1).join(" ") || "";
        } else if (processedKey.includes("phone")) {
          processed.phone = processedValue.replace(/[^0-9+]/g, "");
        } else if (processedKey.includes("email")) {
          processed.email = processedValue.toLowerCase();
        } else if (
          processedKey.includes("message") ||
          processedKey.includes("comment")
        ) {
          processed.message = processedValue;
        } else {
          processed.custom_data[processedKey] = processedValue;
        }
      });
    }

    return processed;
  } catch (error) {
    console.error("Fallback processing error:", error);
    // Return original data in custom_data if all else fails
    return {
      name: "",
      email: "",
      phone: "",
      message: "",
      custom_data: { original_data: data },
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, body, query, headers } = req;
  const action = query.action as string;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const sourceWebhook = `${
      process.env.NEXT_PUBLIC_BASE_URL
    }/leads?action=${"getLeads"}&sourceId=${req.query.sourceId}&workspaceId=${
      req.query.workspaceId
    }`;
    const data = req.body;
    const customData = req.body.custom_data;
    if (!data) {
      return res.status(400).json({ error: "No data provided" });
    }

    // Try AI processing first, fall back to manual if it fails
    let processedData;
    try {
      processedData = await processWithAI(data);
    } catch (error) {
      console.log("AI processing failed, using fallback");
      processedData = fallbackProcess(data);
    }

    // Merge any additional custom data
    if (customData) {
      processedData.custom_data = {
        ...processedData.custom_data,
        ...customData,
      };
    }

    // Validate the processed data
    if (!isValidLead(processedData)) {
      return res.status(400).json({
        error: "Invalid lead data",
        details: "Name or phone number is required",
        data: processedData,
      });
    }
    const { data: webhookMatch, error: webhookError } = await supabase
      .from("webhooks")
      .select("user_id,status")
      .eq("webhook_url", sourceWebhook)
      .single(); // `single()` ensures a single record is returned
    if (webhookError) {
      console.error("Error fetching webhook:", webhookError.message);
      throw new Error("Failed to fetch webhook details.");
    }
    if (!webhookMatch || webhookMatch.status !== true) {
      console.error("Webhook deactivated or not found.");
      throw new Error("Webhook deactivated.");
    }
    // Add metadata
    const leadData = {
      ...processedData,
      created_at: new Date().toISOString(),
      source: req.headers["origin"] || "unknown",
      lead_source_id: req.query.sourceId,
      user_id: webhookMatch?.user_id,
      contact_method: "phone",
      work_id: req.query.workspaceId,
    };

    // Save to database
    const { data: savedData, error: dbError } = await supabase
      .from("leads")
      .insert([leadData])
      .select();

    if (dbError) throw dbError;

    return res.status(200).json({
      message: "Lead successfully saved",
      lead: savedData[0],
    });
  } catch (error: any) {
    console.error("Error processing lead:", error);
    return res.status(500).json({
      error: "Failed to process lead",
      details: error.message,
    });
  }
}
