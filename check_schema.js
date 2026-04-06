const { Pool } = require('pg');
const pool = new Pool({ 
    connectionString: 'postgresql://postgres.mrsebaxssmqrbmxconpa:Nexusalpha@786@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' 
});

async function check() {
    try {
        const jobs = await pool.query("SELECT * FROM jobs LIMIT 1");
        console.log('Jobs keys:', Object.keys(jobs.rows[0] || {}));
        
        const companies = await pool.query("SELECT * FROM companies LIMIT 1");
        console.log('Companies keys:', Object.keys(companies.rows[0] || {}));
        
        const stats = await pool.query("SELECT COUNT(*) FROM companies");
        console.log('Companies count row:', stats.rows[0]);
    } catch (err) {
        console.error('Check Error:', err);
    } finally {
        pool.end();
    }
}

check();
