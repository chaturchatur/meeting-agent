import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client uses the service role key to bypass RLS
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
