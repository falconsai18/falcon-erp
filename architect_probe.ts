
import { createClient } from '@supabase/supabase-js';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()

        const tables = ['inventory', 'inventory_movements', 'raw_materials', 'quality_checks'];
        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                console.log(`\n=== Table: ${t} ===`)
                const props = definition.properties
                Object.keys(props).forEach(c => {
                    console.log(`${c} [${props[c].type}]`)
                })
            }
        }
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
