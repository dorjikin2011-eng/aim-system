const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// CORRECTED PATH - database is in backend root, not src folder
const dbPath = path.join(__dirname, '..', 'aim-system.db');
console.log(`📂 Using database: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at: ${dbPath}`);
  console.log('\n🔍 Looking for database in common locations...');
  
  // Try alternative locations
  const alternativePaths = [
    path.join(__dirname, 'aim-system.db'),
    path.join(__dirname, '..', 'data', 'aim-system.db'),
    path.join(__dirname, '..', 'database', 'aim-system.db'),
  ];
  
  for (const altPath of alternativePaths) {
    if (fs.existsSync(altPath)) {
      console.log(`✅ Found database at: ${altPath}`);
      // Use this path instead
      dbPath = altPath;
      break;
    }
  }
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Could not find database file in any location!');
    process.exit(1);
  }
}

const db = new sqlite3.Database(dbPath);

// Rest of the helper functions remain the same...
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function fixICCSTemplate() {
  try {
    console.log('🔧 Starting ICCS template fix...');
    const adminUserId = 'system_admin';
    const timestamp = new Date().toISOString();

    // Step 1: Get the ICCS indicator ID
    console.log('📊 Looking for ICCS indicator...');
    const iccsIndicator = await getQuery(
      "SELECT id FROM indicators WHERE code = 'ICCS' OR name LIKE '%ICCS%' OR name LIKE '%Internal Corruption Control%'"
    );

    if (!iccsIndicator) {
      console.error('❌ ICCS indicator not found! Please run seed-aims-templates.js first.');
      return;
    }

    console.log(`✅ Found ICCS indicator: ${iccsIndicator.id}`);

    // Step 2: Delete incorrect ACC parameters
    console.log('🗑️  Deleting incorrect ACC parameters...');
    await runQuery(
      "DELETE FROM parameters WHERE code IN ('acc_recommendations_exists', 'acc_recommendations_implemented')"
    );
    console.log('✅ Deleted old ACC parameters');

    // Step 3: Create the correct ACC parameter (3-level select)
    console.log('➕ Creating correct ACC Recommendations parameter...');
    const accParamId = `param_${Date.now()}_acc`;
    await runQuery(
      `INSERT INTO parameters (
        id, code, label, description, type, required, 
        indicator_id, options, ui_settings, display_order,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accParamId,
        'acc_recommendations_implemented',
        'ACC Recommendations Status',
        'Status of ACC recommendations implementation',
        'select',
        1,
        iccsIndicator.id,
        JSON.stringify([
          { label: 'Select status...', value: '' },
          { label: 'Level 1: ACC Recommendations or Proactive Measures PRESENT & Functioning (7 points)', value: 'level1' },
          { label: 'Level 2: No ACC Recommendations AND No Proactive Measures (3 points)', value: 'level2' },
          { label: 'Level 3: ACC Recommendations Exist BUT Not Implemented (0 points)', value: 'level3' }
        ]),
        JSON.stringify({}),
        7,
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log('✅ Created correct ACC parameter');

    // Step 4: Get all ICCS templates
    console.log('📋 Finding ICCS form templates...');
    const templates = await allQuery(
      "SELECT id, name, sections FROM form_templates WHERE name LIKE '%ICCS%' OR sections LIKE '%iccs%'"
    );

    if (templates.length === 0) {
      console.log('⚠️  No ICCS templates found. Creating a new one...');
      
      // Create a new ICCS template
      const templateId = `tpl_${Date.now()}_iccs`;
      const sections = [{
        id: 'section_iccs',
        title: 'Internal Corruption Control Systems (ICCS)',
        description: 'Functioning of agency\'s four core integrity systems',
        columns: 2,
        fields: [
          { 
            id: 'field_complaint_exists', 
            parameterCode: 'complaint_mechanism_exists', 
            label: 'Complaint System Exists', 
            type: 'radio', 
            required: true, 
            width: 100, 
            displayOrder: 1,
            uiSettings: { options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] }
          },
          { 
            id: 'field_complaint_functions', 
            parameterCode: 'complaint_mechanism_functioning', 
            label: 'Complaint System Functions', 
            type: 'radio', 
            required: true, 
            width: 100, 
            displayOrder: 2,
            uiSettings: { options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] }
          },
          { 
            id: 'field_conflict_exists', 
            parameterCode: 'coi_system_exists', 
            label: 'Conflict System Exists', 
            type: 'radio', 
            required: true, 
            width: 100, 
            displayOrder: 3,
            uiSettings: { options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] }
          },
          { 
            id: 'field_conflict_functions', 
            parameterCode: 'coi_system_functioning', 
            label: 'Conflict System Functions', 
            type: 'radio', 
            required: true, 
            width: 100, 
            displayOrder: 4,
            uiSettings: { options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] }
          },
          { 
            id: 'field_gift_exists', 
            parameterCode: 'gift_register_exists', 
            label: 'Gift System Exists', 
            type: 'radio', 
            required: true, 
            width: 100, 
            displayOrder: 5,
            uiSettings: { options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] }
          },
          { 
            id: 'field_gift_functions', 
            parameterCode: 'gift_register_functioning', 
            label: 'Gift System Functions', 
            type: 'radio', 
            required: true, 
            width: 100, 
            displayOrder: 6,
            uiSettings: { options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] }
          },
          { 
            id: 'field_acc_status', 
            parameterCode: 'acc_recommendations_implemented', 
            label: 'ACC Recommendations Status', 
            type: 'select', 
            required: true, 
            width: 100, 
            displayOrder: 7,
            uiSettings: {
              options: [
                { label: 'Select status...', value: '' },
                { label: 'Level 1: ACC Recommendations or Proactive Measures PRESENT & Functioning (7 points)', value: 'level1' },
                { label: 'Level 2: No ACC Recommendations AND No Proactive Measures (3 points)', value: 'level2' },
                { label: 'Level 3: ACC Recommendations Exist BUT Not Implemented (0 points)', value: 'level3' }
              ]
            }
          }
        ],
        displayOrder: 1
      }];

      await runQuery(
        `INSERT INTO form_templates (
          id, code, name, description, template_type, indicator_ids, sections,
          ui_config, is_active, version, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          'ICCS_ASSESSMENT_FIXED',
          'ICCS Framework Assessment (Fixed)',
          'Assessment of Internal Corruption Control Systems - 7 fields',
          'assessment',
          JSON.stringify([iccsIndicator.id]),
          JSON.stringify(sections),
          JSON.stringify({ showScoringRules: true, showSystemGroups: true }),
          1,
          '1.0',
          adminUserId,
          adminUserId,
          timestamp,
          timestamp
        ]
      );
      console.log(`✅ Created new ICCS template: ${templateId}`);
    } else {
      // Update existing templates
      for (const template of templates) {
        console.log(`📝 Updating template: ${template.name} (${template.id})`);
        
        let sections = JSON.parse(template.sections);
        
        // Find ICCS section
        const iccsSection = sections.find(s => 
          s.title?.includes('ICCS') || s.id?.includes('iccs')
        );

        if (iccsSection) {
          // Filter out the incorrect ACC fields and add the correct one
          const correctFields = iccsSection.fields.filter(f => 
            !['acc_recommendations_exists', 'acc_recommendations_implemented'].includes(f.parameterCode)
          );

          // Add the correct ACC status field if not present
          const hasCorrectAcc = correctFields.some(f => f.parameterCode === 'acc_recommendations_implemented');
          
          if (!hasCorrectAcc) {
            correctFields.push({
              id: `field_acc_status_${Date.now()}`,
              parameterCode: 'acc_recommendations_implemented',
              label: 'ACC Recommendations Status',
              type: 'select',
              required: true,
              width: 100,
              displayOrder: 7,
              uiSettings: {
                options: [
                  { label: 'Select status...', value: '' },
                  { label: 'Level 1: ACC Recommendations or Proactive Measures PRESENT & Functioning (7 points)', value: 'level1' },
                  { label: 'Level 2: No ACC Recommendations AND No Proactive Measures (3 points)', value: 'level2' },
                  { label: 'Level 3: ACC Recommendations Exist BUT Not Implemented (0 points)', value: 'level3' }
                ]
              }
            });
          }

          // Sort by displayOrder
          correctFields.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
          
          // Update displayOrder to be sequential
          correctFields.forEach((f, idx) => { f.displayOrder = idx + 1; });
          
          iccsSection.fields = correctFields;
          
          // Update the template
          await runQuery(
            'UPDATE form_templates SET sections = ?, updated_at = ? WHERE id = ?',
            [JSON.stringify(sections), timestamp, template.id]
          );
          
          console.log(`✅ Updated template: ${template.id} - Now has ${correctFields.length} fields`);
        }
      }
    }

    // Step 5: Verify the fix
    console.log('\n' + '='.repeat(50));
    console.log('🔍 VERIFICATION:');
    console.log('='.repeat(50));

    // Check parameters
    const params = await allQuery(
      "SELECT code, label, type FROM parameters WHERE indicator_id = ? ORDER BY display_order",
      [iccsIndicator.id]
    );
    
    console.log('\n📊 ICCS Parameters in database:');
    params.forEach(p => console.log(`   - ${p.code} (${p.type}): ${p.label}`));

    // Check templates
    const updatedTemplates = await allQuery(
      "SELECT id, name, sections FROM form_templates WHERE sections LIKE '%iccs%'"
    );

    console.log('\n📋 ICCS Templates:');
    for (const t of updatedTemplates) {
      const sections = JSON.parse(t.sections);
      const iccsSection = sections.find(s => s.title?.includes('ICCS'));
      if (iccsSection) {
        console.log(`   - ${t.name}: ${iccsSection.fields.length} fields`);
        iccsSection.fields.forEach(f => {
          console.log(`     • ${f.parameterCode} (${f.type})`);
        });
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ ICCS template fix complete!');
    console.log('🎯 Please refresh your browser and reload the form.');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error fixing ICCS template:', error);
  } finally {
    db.close();
  }
}

// Run the fix
fixICCSTemplate().catch(console.error);