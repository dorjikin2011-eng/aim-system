const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./aim-system.db');

console.log('🔧 Fixing ICCS template...');

db.serialize(() => {
  // Get ICCS indicator
  db.get("SELECT id FROM indicators WHERE code = 'ICCS' OR name LIKE '%ICCS%'", (err, row) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }
    
    if (!row) {
      console.error('❌ ICCS indicator not found!');
      console.log('Please run seed-aims-templates.js first.');
      return;
    }
    
    console.log('✅ Found ICCS indicator:', row.id);
    
    // Delete incorrect parameters
    db.run("DELETE FROM parameters WHERE code IN ('acc_recommendations_exists', 'acc_recommendations_implemented')", function(err) {
      if (err) {
        console.error('❌ Error deleting parameters:', err);
      } else {
        console.log('✅ Deleted old ACC parameters');
      }
    });
    
    // Create correct parameter
    const accParamId = 'param_' + Date.now() + '_acc';
    const options = JSON.stringify([
      { label: 'Select status...', value: '' },
      { label: 'Level 1: ACC Recommendations or Proactive Measures PRESENT & Functioning (7 points)', value: 'level1' },
      { label: 'Level 2: No ACC Recommendations AND No Proactive Measures (3 points)', value: 'level2' },
      { label: 'Level 3: ACC Recommendations Exist BUT Not Implemented (0 points)', value: 'level3' }
    ]);
    
    db.run(
      `INSERT INTO parameters (
        id, code, label, description, type, required, 
        indicator_id, options, ui_settings, display_order,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        accParamId,
        'acc_recommendations_implemented',
        'ACC Recommendations Status',
        'Status of ACC recommendations implementation',
        'select',
        1,
        row.id,
        options,
        '{}',
        7,
        'system_admin',
        'system_admin'
      ],
      function(err) {
        if (err) {
          console.error('❌ Error creating parameter:', err);
        } else {
          console.log('✅ Created correct ACC parameter');
        }
      }
    );
    
    // Update templates
    db.all("SELECT id, name, sections FROM form_templates WHERE name LIKE '%ICCS%' OR sections LIKE '%iccs%'", (err, templates) => {
      if (err) {
        console.error('❌ Error finding templates:', err);
        return;
      }
      
      if (templates.length === 0) {
        console.log('⚠️ No ICCS templates found to update');
      } else {
        templates.forEach(template => {
          try {
            let sections = JSON.parse(template.sections);
            let updated = false;
            
            // Find ICCS section
            sections.forEach(section => {
              if (section.title?.includes('ICCS') || section.id?.includes('iccs')) {
                // Remove incorrect fields
                const originalLength = section.fields.length;
                section.fields = section.fields.filter(f => 
                  !['acc_recommendations_exists', 'acc_recommendations_implemented'].includes(f.parameterCode)
                );
                
                if (section.fields.length !== originalLength) {
                  updated = true;
                }
                
                // Add correct field if not present
                if (!section.fields.some(f => f.parameterCode === 'acc_recommendations_implemented')) {
                  section.fields.push({
                    id: 'field_acc_status_' + Date.now(),
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
                  updated = true;
                }
                
                // Sort fields by displayOrder
                section.fields.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
                section.fields.forEach((f, idx) => { f.displayOrder = idx + 1; });
              }
            });
            
            if (updated) {
              db.run(
                'UPDATE form_templates SET sections = ?, updated_at = datetime("now") WHERE id = ?',
                [JSON.stringify(sections), template.id],
                function(err) {
                  if (err) {
                    console.error('❌ Error updating template:', err);
                  } else {
                    console.log('✅ Updated template:', template.name);
                  }
                }
              );
            } else {
              console.log('✓ Template already correct:', template.name);
            }
          } catch (e) {
            console.error('❌ Error parsing template:', e);
          }
        });
      }
      
      // Wait a bit for all queries to complete
      setTimeout(() => {
        console.log('\n' + '='.repeat(50));
        console.log('✅ ICCS template fix complete!');
        console.log('🎯 Next steps:');
        console.log('   1. Restart your backend: npm run dev');
        console.log('   2. Clear browser cache');
        console.log('   3. Reload the form');
        console.log('='.repeat(50));
        
        db.close();
      }, 1000);
    });
  });
});
