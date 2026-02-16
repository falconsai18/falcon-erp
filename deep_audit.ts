
import fs from 'fs';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()

        let report = '=== DEEP SCHEMA AUDIT ===\n\n';
        const tables = ['inventory', 'inventory_movements', 'quality_checks', 'quality_check_items'];

        for (const t of tables) {
            const definition = spec.definitions[t]
            if (definition) {
                report += `=== Table: ${t} ===\n`;
                const props = definition.properties;
                const required = definition.required || [];

                Object.keys(props).forEach(c => {
                    const type = props[c].type || 'unknown';
                    const format = props[c].format || '';
                    const description = props[c].description || '';
                    const isRequired = required.includes(c) ? '[REQUIRED]' : '[NULLABLE]';
                    report += `${c} [${type}${format ? ':' + format : ''}] ${isRequired} ${description ? '- ' + description : ''}\n`;
                });

                // Check if there are any hints about unique constraints in the description or elsewhere
                if (definition.description) {
                    report += `Table Description: ${definition.description}\n`;
                }
                report += '\n';
            }
        }

        fs.writeFileSync('deep_schema_report.txt', report);
        console.log('Deep audit saved to deep_schema_report.txt');
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
