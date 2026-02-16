
import fs from 'fs';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()

        let report = '=== Table Comparison ===\n\n';
        const tables = ['work_orders', 'production_orders', 'raw_materials', 'products'];

        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                report += `=== Table: ${t} ===\n`;
                const props = definition.properties;
                const required = definition.required || [];
                Object.keys(props).forEach(c => {
                    const type = props[c].type || 'unknown';
                    const isRequired = required.includes(c) ? '[REQUIRED]' : '[NULLABLE]';
                    report += `${c} [${type}] ${isRequired}\n`;
                });
                report += '\n';
            }
        }

        fs.writeFileSync('table_comparison.txt', report);
        console.log('Comparison saved to table_comparison.txt');
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
