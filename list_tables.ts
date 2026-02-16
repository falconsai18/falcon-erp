
import fs from 'fs';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseAnonKey }
        })
        const spec: any = await response.json()

        let report = '=== TABLE LIST ===\n\n';
        Object.keys(spec.definitions).forEach(t => {
            report += `${t}\n`;
        });

        fs.writeFileSync('table_list.txt', report);
        console.log('Table list saved to table_list.txt');
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
