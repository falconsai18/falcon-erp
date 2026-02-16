
async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()
        const tables = ['inventory', 'inventory_movements', 'quality_checks', 'quality_check_items']
        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                console.log(`=== TABLE: ${t} ===`)
                const props = definition.properties
                Object.keys(props).forEach(c => {
                    const type = props[c].type || 'unknown'
                    const format = props[c].format || ''
                    console.log(`${c} [${type}${format ? ':' + format : ''}]`)
                })
                console.log('\n')
            }
        }
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
