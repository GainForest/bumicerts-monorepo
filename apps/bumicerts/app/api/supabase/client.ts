import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = "https://wgdcmbgbfcaplqeavijz.supabase.co";
// Validated at runtime in each route handler; empty string at build time is fine
const supabaseKey = process.env.SUPABASE_KEY ?? "";

const supabase = createClient<Database>(supabaseUrl, supabaseKey || "placeholder");

export default supabase;
