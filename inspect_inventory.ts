
async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()
        const tables = ['inventory', 'inventory_movements']
        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                console.log(`--- ${t} ---`)
                Object.keys(definition.properties).forEach(c => console.log(c))
            } else {
                console.log(`--- ${t} Not Found ---`)
            }
        }
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
