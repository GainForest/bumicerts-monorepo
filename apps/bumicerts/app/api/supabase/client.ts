import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";
import { serverEnv as env } from "@/lib/env/server";

const supabaseUrl = "https://wgdcmbgbfcaplqeavijz.supabase.co";

const supabase = createClient<Database>(supabaseUrl, env.SUPABASE_KEY);

export default supabase;
