
import fs from 'fs';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()

        const tables = ['raw_materials', 'quality_checks'];
        let report = '';

        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                report += `=== Table: ${t} ===\n`;
                const props = definition.properties;
                Object.keys(props).forEach(c => {
                    const type = props[c].type || 'unknown';
                    report += `${c} [${type}]\n`;
                });
                report += '\n';
            }
        }

        fs.writeFileSync('architect_audit.txt', report);
        console.log('Audit saved to architect_audit.txt');
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
