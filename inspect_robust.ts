
import fs from 'fs';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()
        const tables = ['inventory', 'inventory_movements', 'quality_checks', 'quality_check_items']
        let output = ''
        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                output += `=== TABLE: ${t} ===\n`
                const props = definition.properties
                Object.keys(props).forEach(c => {
                    const type = props[c].type || 'unknown'
                    const format = props[c].format || ''
                    output += `${c} [${type}${format ? ':' + format : ''}]\n`
                })
                output += '\n'
            }
        }
        fs.writeFileSync('schema_audit.txt', output)
        console.log('Audit saved to schema_audit.txt')
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
