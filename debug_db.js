const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
    connectionString: 'postgresql://postgres.mrsebaxssmqrbmxconpa:Nexusalpha@786@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' 
});

async function testQuery() {
    try {
        console.log("Checking Jobs table...");
        const res = await pool.query("SELECT status, count(*) FROM jobs GROUP BY status");
        console.log("Job Statuses:", res.rows);
        
        const allJobs = await pool.query("SELECT id, jobtitle, status FROM jobs LIMIT 10");
        console.log("Sample Jobs:", allJobs.rows);
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
}

testQuery();
