import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  // Use the Service Role Key (Server-Side Only)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
