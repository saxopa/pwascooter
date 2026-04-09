import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://ymfmkdmglioztsgzbitw.supabase.co', 'dummy')

try {
  let query = supabase.from('hosts_map').select('*')
  console.log("abortSignal type:", typeof query.abortSignal)
} catch (e) {
  console.error(e)
}
