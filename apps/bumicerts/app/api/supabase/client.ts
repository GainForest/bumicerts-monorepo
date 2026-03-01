import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";
const supabaseUrl = "https://wgdcmbgbfcaplqeavijz.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error("SUPABASE_KEY is not set");
}
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;
