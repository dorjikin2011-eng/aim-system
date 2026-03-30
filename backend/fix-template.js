const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://aims_user:lSzb4imF66yZ6g9PFvQhc7bxYLdLJWga@dpg-cvpcme3tq21c73dkbsug-a.oregon-postgres.render.com/aims_db_b2iy',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    // Check if template exists
    const check = await pool.query("SELECT COUNT(*) FROM form_templates WHERE id = 'template_aims_assessment_v3'");
    
    if (parseInt(check.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO form_templates (id, name, description, template_type, indicator_ids, sections, version, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'template_aims_assessment_v3',
        'AIMS Assessment Form (V3)',
        'Standard AIMS assessment form',
        'assessment',
        JSON.stringify(['ind_iccs_v3', 'ind_training_v3', 'ind_ad_v3', 'ind_coc_v3', 'ind_cases_v3']),
        '[]',
        '3.0.0',
        true,
        'system',
        'system'
      ]);
      console.log('✅ Form template created!');
    } else {
      console.log('✅ Template already exists');
    }
    
    // Check admin user
    const adminCheck = await pool.query("SELECT COUNT(*) FROM users WHERE email = 'kindorji@acc.org.bt'");
    console.log(`Admin user exists: ${parseInt(adminCheck.rows[0].count) > 0}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

fix();