
import { createClient } from '@supabase/supabase-js';

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        console.log('=== Record Counts ===');
        const tables = ['work_orders', 'production_orders', 'inventory', 'inventory_movements', 'quality_checks', 'products', 'raw_materials'];
        for (const t of tables) {
            const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
            console.log(`${t}: ${count} records`);
        }

        console.log('\n=== Probing Unique Constraints on quality_checks ===');
        // Try to insert a dummy record and then a duplicate
        const dummyId = '00000000-0000-0000-0000-000000000001';
        const { error: err1 } = await supabase.from('quality_checks').insert({
            id: dummyId,
            parameter: 'Probe',
            expected_value: '1',
            actual_value: '1',
            result: 'passed'
        });

        if (err1) console.log('Insert 1 failed (might already exist):', err1.message);

        const { error: err2 } = await supabase.from('quality_checks').insert({
            id: '00000000-0000-0000-0000-000000000002',
            parameter: 'Probe',
            expected_value: '1',
            actual_value: '1',
            result: 'passed'
        });
        if (err2) console.log('Insert 2 (duplicate parameter?) failed:', err2.message);

        // Clean up
        await supabase.from('quality_checks').delete().eq('parameter', 'Probe');

    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    }
}
check()
