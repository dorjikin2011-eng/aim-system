// backend/src/scripts/seed-aims-templates.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect to database - CORRECTED PATH
const dbPath = path.join(__dirname, '../aim-system.db');
console.log(`📂 Using database: ${dbPath}`);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at: ${dbPath}`);
  console.log('Please make sure the database exists before running this script.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// Helper functions
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

// Generate ID
function generateId() {
  return `ind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTemplateId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function seedAIMSIndicators() {
  try {
    console.log('🌱 Starting AIMS indicator seed...');
    const adminUserId = 'system_admin';
    const timestamp = new Date().toISOString();

    // First, check if indicators already exist
    const existingIndicators = await allQuery(
      "SELECT code FROM indicators WHERE code IN ('ICCS', 'INTEGRITY_TRAINING', 'ASSET_DECLARATION', 'CORRUPTION_CASES', 'ATR_RESPONSIVENESS')"
    );
    
    if (existingIndicators.length > 0) {
      console.log('⚠️  Some AIMS indicators already exist:');
      existingIndicators.forEach(ind => console.log(`   - ${ind.code}`));
      console.log('Do you want to continue? (y/n)');
      
      // For now, we'll continue but you might want to add a prompt
      console.log('Continuing with seed...');
    }

    // ==================== 1. CREATE ICCS INDICATOR ====================
    console.log('📝 Creating ICCS Framework indicator...');
    
    const iccsIndicatorId = generateId();
    await runQuery(
      `INSERT INTO indicators (
        id, code, name, description, category, weight, max_score,
        scoring_method, formula, parameters, scoring_rules, ui_config,
        is_active, display_order, metadata, version,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        iccsIndicatorId,
        'ICCS',
        'Internal Corruption Control Systems (ICCS)',
        'Functioning of agency\'s four core integrity systems',
        'iccs_framework',
        28,
        28,
        'sum',
        '',
        JSON.stringify([
          { id: 'param1', code: 'complaint_mechanism_exists', label: 'Complaint Management Mechanism Exists', type: 'boolean', description: 'Formal mechanism for reporting violations of code of conduct', required: true, displayOrder: 1, isActive: true },
          { id: 'param2', code: 'complaint_mechanism_functioning', label: 'Complaint Mechanism Functioning', type: 'boolean', description: 'Mechanism is actively used and monitored', required: true, displayOrder: 2, isActive: true },
          { id: 'param3', code: 'coi_system_exists', label: 'Conflict of Interest Declaration System Exists', type: 'boolean', description: 'Formal system for COI declarations', required: true, displayOrder: 3, isActive: true },
          { id: 'param4', code: 'coi_system_functioning', label: 'COI System Functioning', type: 'boolean', description: 'System is actively used and reviewed', required: true, displayOrder: 4, isActive: true },
          { id: 'param5', code: 'gift_register_exists', label: 'Gift Register & Reporting System Exists', type: 'boolean', description: 'Formal system for gift registration', required: true, displayOrder: 5, isActive: true },
          { id: 'param6', code: 'gift_register_functioning', label: 'Gift Register Functioning', type: 'boolean', description: 'System is actively used and monitored', required: true, displayOrder: 6, isActive: true },
          { id: 'param7', code: 'acc_recommendations_exists', label: 'ACC Recommendations or Proactive Measures Exist', type: 'boolean', description: 'ACC systemic recommendations or agency\'s proactive measures', required: true, displayOrder: 7, isActive: true },
          { id: 'param8', code: 'acc_recommendations_implemented', label: 'ACC Recommendations Implemented', type: 'boolean', description: 'Recommendations are fully implemented', required: true, displayOrder: 8, isActive: true }
        ]),
        JSON.stringify([
          { id: 'rule1', parameterCode: 'complaint_mechanism_exists', condition: 'true', points: 3, description: 'Complaint mechanism exists' },
          { id: 'rule2', parameterCode: 'complaint_mechanism_functioning', condition: 'true', points: 4, description: 'Complaint mechanism functioning' },
          { id: 'rule3', parameterCode: 'coi_system_exists', condition: 'true', points: 3, description: 'COI system exists' },
          { id: 'rule4', parameterCode: 'coi_system_functioning', condition: 'true', points: 4, description: 'COI system functioning' },
          { id: 'rule5', parameterCode: 'gift_register_exists', condition: 'true', points: 3, description: 'Gift register exists' },
          { id: 'rule6', parameterCode: 'gift_register_functioning', condition: 'true', points: 4, description: 'Gift register functioning' },
          { id: 'rule7', parameterCode: 'acc_recommendations_exists', condition: 'true', points: 7, description: 'ACC recommendations exist AND functioning → 7 points' },
          { id: 'rule8', parameterCode: 'acc_recommendations_exists', condition: 'false', points: 3, dependsOn: ['acc_recommendations_implemented'], description: 'No ACC recommendations AND no proactive measures → 3 points' },
          { id: 'rule9', parameterCode: 'acc_recommendations_implemented', condition: 'false', points: 0, dependsOn: ['acc_recommendations_exists'], description: 'ACC recommendations exist BUT not implemented → 0 points' }
        ]),
        JSON.stringify({ showScoringRules: true, groupBySystem: true }),
        1,
        1,
        JSON.stringify({ source: 'AIMS Guideline 2025', points: 28 }),
        1,
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ ICCS indicator created: ${iccsIndicatorId}`);

    // ==================== 2. CREATE INTEGRITY TRAINING INDICATOR ====================
    console.log('📝 Creating Integrity Training indicator...');
    
    const trainingIndicatorId = generateId();
    await runQuery(
      `INSERT INTO indicators (id, code, name, description, category, weight, max_score, scoring_method, parameters, scoring_rules, ui_config, is_active, display_order, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trainingIndicatorId,
        'INTEGRITY_TRAINING',
        'Integrity Capacity Building (Staff Training)',
        '% of employees completing ACC\'s e-Learning course',
        'integrity_training',
        26,
        26,
        'conditional',
        JSON.stringify([
          { id: 'param9', code: 'training_completion_rate', label: 'Training Completion Rate (%)', type: 'percentage', description: 'Percentage of employees who completed ACC e-Learning', required: true, validation: { min: 0, max: 100 }, displayOrder: 1, isActive: true, uiSettings: { helpText: 'Enter percentage (0-100) of employees who completed the training' } }
        ]),
        JSON.stringify([
          { id: 'rule10', parameterCode: 'training_completion_rate', condition: '>= 85', points: 26, description: '85% or more → 26 points' },
          { id: 'rule11', parameterCode: 'training_completion_rate', condition: '>= 70', points: 18, description: '70-84% → 18 points' },
          { id: 'rule12', parameterCode: 'training_completion_rate', condition: '>= 50', points: 10, description: '50-69% → 10 points' },
          { id: 'rule13', parameterCode: 'training_completion_rate', condition: '< 50', points: 0, description: 'Less than 50% → 0 points' }
        ]),
        JSON.stringify({ showPercentageBar: true, thresholds: [85, 70, 50] }),
        1,
        2,
        1,
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ Training indicator created: ${trainingIndicatorId}`);

    // ==================== 3. CREATE ASSET DECLARATION INDICATOR ====================
    console.log('📝 Creating Asset Declaration indicator...');
    
    const assetIndicatorId = generateId();
    await runQuery(
      `INSERT INTO indicators (id, code, name, description, category, weight, max_score, scoring_method, parameters, scoring_rules, ui_config, is_active, display_order, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assetIndicatorId,
        'ASSET_DECLARATION',
        'Asset Declaration Compliance',
        '% of covered officials submitting Asset Declarations on time',
        'asset_declaration',
        16,
        16,
        'conditional',
        JSON.stringify([
          { id: 'param10', code: 'ad_compliance_rate', label: 'Asset Declaration Compliance Rate (%)', type: 'percentage', description: 'Percentage of officials submitting AD on time', required: true, validation: { min: 0, max: 100 }, displayOrder: 1, isActive: true, uiSettings: { helpText: 'Enter percentage (0-100) of officials who submitted AD on time' } }
        ]),
        JSON.stringify([
          { id: 'rule14', parameterCode: 'ad_compliance_rate', condition: '== 100', points: 16, description: '100% → 16 points' },
          { id: 'rule15', parameterCode: 'ad_compliance_rate', condition: '>= 95', points: 10, description: '95-99% → 10 points' },
          { id: 'rule16', parameterCode: 'ad_compliance_rate', condition: '>= 90', points: 5, description: '90-94% → 5 points' },
          { id: 'rule17', parameterCode: 'ad_compliance_rate', condition: '< 90', points: 0, description: 'Less than 90% → 0 points' }
        ]),
        JSON.stringify({ showPercentageBar: true, thresholds: [100, 95, 90] }),
        1,
        3,
        1,
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ Asset Declaration indicator created: ${assetIndicatorId}`);

    // ==================== 4. CREATE CORRUPTION CASES INDICATOR ====================
    console.log('📝 Creating Corruption Cases indicator...');
    
    const casesIndicatorId = generateId();
    await runQuery(
      `INSERT INTO indicators (id, code, name, description, category, weight, max_score, scoring_method, parameters, scoring_rules, ui_config, is_active, display_order, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        casesIndicatorId,
        'CORRUPTION_CASES',
        'Corruption Case Severity & Resolution',
        'Weighted severity of corruption cases involving agency staff',
        'case_handling',
        20,
        20,
        'weighted',
        JSON.stringify([
          { id: 'param11', code: 'conviction_cases', label: 'Conviction Cases (Severity: 3)', type: 'number', description: 'Number of conviction cases in the fiscal year', required: false, validation: { min: 0 }, displayOrder: 1, isActive: true, weight: 3 },
          { id: 'param12', code: 'prosecution_cases', label: 'Prosecution/OAG Referral Cases (Severity: 2)', type: 'number', description: 'Number of prosecution/OAG referral cases', required: false, validation: { min: 0 }, displayOrder: 2, isActive: true, weight: 2 },
          { id: 'param13', code: 'admin_action_cases', label: 'ACC-confirmed Admin Action Cases (Severity: 1)', type: 'number', description: 'Number of administrative action cases', required: false, validation: { min: 0 }, displayOrder: 3, isActive: true, weight: 1 }
        ]),
        JSON.stringify([
          { id: 'rule18', parameterCode: 'conviction_cases', condition: '> 0', points: 3, description: 'Conviction: 3 points per case' },
          { id: 'rule19', parameterCode: 'prosecution_cases', condition: '> 0', points: 2, description: 'Prosecution: 2 points per case' },
          { id: 'rule20', parameterCode: 'admin_action_cases', condition: '> 0', points: 1, description: 'Admin action: 1 point per case' }
        ]),
        JSON.stringify({ showSeverityWeights: true, severityLabels: ['Conviction (3)', 'Prosecution (2)', 'Admin Action (1)'] }),
        1,
        4,
        1,
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ Corruption Cases indicator created: ${casesIndicatorId}`);

    // ==================== 5. CREATE ATR RESPONSIVENESS INDICATOR ====================
    console.log('📝 Creating ATR Responsiveness indicator...');
    
    const atrIndicatorId = generateId();
    await runQuery(
      `INSERT INTO indicators (id, code, name, description, category, weight, max_score, scoring_method, parameters, scoring_rules, ui_config, is_active, display_order, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        atrIndicatorId,
        'ATR_RESPONSIVENESS',
        'ATR Responsiveness',
        '% of ATRs submitted by agency within ACC\'s deadlines',
        'atr_timeliness',
        10,
        10,
        'conditional',
        JSON.stringify([
          { id: 'param14', code: 'atr_timeliness_rate', label: 'ATR Timeliness Rate (%)', type: 'percentage', description: 'Percentage of ATRs submitted within deadlines', required: true, validation: { min: 0, max: 100 }, displayOrder: 1, isActive: true, uiSettings: { helpText: 'Enter percentage (0-100) of ATRs submitted on time' } }
        ]),
        JSON.stringify([
          { id: 'rule21', parameterCode: 'atr_timeliness_rate', condition: '>= 90', points: 10, description: '90% or more → 10 points' },
          { id: 'rule22', parameterCode: 'atr_timeliness_rate', condition: '>= 70', points: 7, description: '70-89% → 7 points' },
          { id: 'rule23', parameterCode: 'atr_timeliness_rate', condition: '< 70', points: 3, description: 'Less than 70% → 3 points' }
        ]),
        JSON.stringify({ showPercentageBar: true, thresholds: [90, 70] }),
        1,
        5,
        1,
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ ATR Responsiveness indicator created: ${atrIndicatorId}`);

    // ==================== CREATE FORM TEMPLATES ====================
    console.log('📄 Creating form templates...');

    // 1. ICCS Form Template
    const iccsTemplateId = generateTemplateId();
    await runQuery(
      `INSERT INTO form_templates (
        id, code, name, description, template_type, indicator_ids, sections,
        ui_config, is_active, version, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        iccsTemplateId,
        'ICCS_ASSESSMENT',
        'ICCS Framework Assessment',
        'Assessment of Internal Corruption Control Systems',
        'assessment',
        JSON.stringify([iccsIndicatorId]),
        JSON.stringify([
          {
            id: 'section_iccs',
            title: 'Internal Corruption Control Systems',
            description: 'Assess the four core integrity systems',
            columns: 2,
            fields: [
              { id: 'field1', parameterCode: 'complaint_mechanism_exists', indicatorId: iccsIndicatorId, label: 'Complaint Mechanism Exists', type: 'boolean', required: true, width: 100, displayOrder: 1 },
              { id: 'field2', parameterCode: 'complaint_mechanism_functioning', indicatorId: iccsIndicatorId, label: 'Complaint Mechanism Functioning', type: 'boolean', required: true, width: 100, displayOrder: 2 },
              { id: 'field3', parameterCode: 'coi_system_exists', indicatorId: iccsIndicatorId, label: 'COI System Exists', type: 'boolean', required: true, width: 100, displayOrder: 3 },
              { id: 'field4', parameterCode: 'coi_system_functioning', indicatorId: iccsIndicatorId, label: 'COI System Functioning', type: 'boolean', required: true, width: 100, displayOrder: 4 },
              { id: 'field5', parameterCode: 'gift_register_exists', indicatorId: iccsIndicatorId, label: 'Gift Register Exists', type: 'boolean', required: true, width: 100, displayOrder: 5 },
              { id: 'field6', parameterCode: 'gift_register_functioning', indicatorId: iccsIndicatorId, label: 'Gift Register Functioning', type: 'boolean', required: true, width: 100, displayOrder: 6 },
              { id: 'field7', parameterCode: 'acc_recommendations_exists', indicatorId: iccsIndicatorId, label: 'ACC Recommendations Exist', type: 'boolean', required: true, width: 100, displayOrder: 7 },
              { id: 'field8', parameterCode: 'acc_recommendations_implemented', indicatorId: iccsIndicatorId, label: 'ACC Recommendations Implemented', type: 'boolean', required: true, width: 100, displayOrder: 8 }
            ],
            displayOrder: 1
          }
        ]),
        JSON.stringify({ showScoringRules: true, showSystemGroups: true }),
        1,
        '1.0',
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ ICCS template created: ${iccsTemplateId}`);

    // 2. Training Form Template
    const trainingTemplateId = generateTemplateId();
    await runQuery(
      `INSERT INTO form_templates (id, code, name, description, template_type, indicator_ids, sections, ui_config, is_active, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trainingTemplateId,
        'TRAINING_ASSESSMENT',
        'Integrity Training Assessment',
        'Assessment of staff training completion rates',
        'assessment',
        JSON.stringify([trainingIndicatorId]),
        JSON.stringify([
          {
            id: 'section_training',
            title: 'Integrity Training Completion',
            description: 'Enter training completion percentage',
            columns: 1,
            fields: [
              { id: 'field9', parameterCode: 'training_completion_rate', indicatorId: trainingIndicatorId, label: 'Training Completion Rate (%)', type: 'percentage', required: true, width: 100, displayOrder: 1, uiSettings: { helpText: 'Percentage of employees who completed ACC e-Learning course' } }
            ],
            displayOrder: 1
          }
        ]),
        JSON.stringify({ showPercentageInput: true, showThresholds: true }),
        1,
        '1.0',
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ Training template created: ${trainingTemplateId}`);

    // 3. Asset Declaration Template
    const assetTemplateId = generateTemplateId();
    await runQuery(
      `INSERT INTO form_templates (id, code, name, description, template_type, indicator_ids, sections, ui_config, is_active, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assetTemplateId,
        'ASSET_DECLARATION_ASSESSMENT',
        'Asset Declaration Compliance Assessment',
        'Assessment of asset declaration submission compliance',
        'assessment',
        JSON.stringify([assetIndicatorId]),
        JSON.stringify([
          {
            id: 'section_asset',
            title: 'Asset Declaration Compliance',
            description: 'Enter asset declaration compliance percentage',
            columns: 1,
            fields: [
              { id: 'field10', parameterCode: 'ad_compliance_rate', indicatorId: assetIndicatorId, label: 'Asset Declaration Compliance Rate (%)', type: 'percentage', required: true, width: 100, displayOrder: 1, uiSettings: { helpText: 'Percentage of covered officials submitting AD on time' } }
            ],
            displayOrder: 1
          }
        ]),
        JSON.stringify({ showPercentageInput: true, showThresholds: true }),
        1,
        '1.0',
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ Asset Declaration template created: ${assetTemplateId}`);

    // 4. Corruption Cases Template
    const casesTemplateId = generateTemplateId();
    await runQuery(
      `INSERT INTO form_templates (id, code, name, description, template_type, indicator_ids, sections, ui_config, is_active, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        casesTemplateId,
        'CORRUPTION_CASES_ASSESSMENT',
        'Corruption Cases Assessment',
        'Assessment of corruption case severity and resolution',
        'assessment',
        JSON.stringify([casesIndicatorId]),
        JSON.stringify([
          {
            id: 'section_cases',
            title: 'Corruption Case Severity',
            description: 'Enter number of cases by severity level',
            columns: 3,
            fields: [
              { id: 'field11', parameterCode: 'conviction_cases', indicatorId: casesIndicatorId, label: 'Conviction Cases', type: 'number', required: false, width: 100, displayOrder: 1, uiSettings: { helpText: 'Number of conviction cases (Severity: 3)' } },
              { id: 'field12', parameterCode: 'prosecution_cases', indicatorId: casesIndicatorId, label: 'Prosecution/OAG Cases', type: 'number', required: false, width: 100, displayOrder: 2, uiSettings: { helpText: 'Number of prosecution/OAG referral cases (Severity: 2)' } },
              { id: 'field13', parameterCode: 'admin_action_cases', indicatorId: casesIndicatorId, label: 'Admin Action Cases', type: 'number', required: false, width: 100, displayOrder: 3, uiSettings: { helpText: 'Number of ACC-confirmed administrative action cases (Severity: 1)' } }
            ],
            displayOrder: 1
          }
        ]),
        JSON.stringify({ showSeverityWeights: true, showTotalScore: true }),
        1,
        '1.0',
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ Corruption Cases template created: ${casesTemplateId}`);

    // 5. ATR Responsiveness Template
    const atrTemplateId = generateTemplateId();
    await runQuery(
      `INSERT INTO form_templates (id, code, name, description, template_type, indicator_ids, sections, ui_config, is_active, version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        atrTemplateId,
        'ATR_RESPONSIVENESS_ASSESSMENT',
        'ATR Responsiveness Assessment',
        'Assessment of ATR submission timeliness',
        'assessment',
        JSON.stringify([atrIndicatorId]),
        JSON.stringify([
          {
            id: 'section_atr',
            title: 'ATR Timeliness',
            description: 'Enter ATR submission timeliness percentage',
            columns: 1,
            fields: [
              { id: 'field14', parameterCode: 'atr_timeliness_rate', indicatorId: atrIndicatorId, label: 'ATR Timeliness Rate (%)', type: 'percentage', required: true, width: 100, displayOrder: 1, uiSettings: { helpText: 'Percentage of ATRs submitted within ACC deadlines' } }
            ],
            displayOrder: 1
          }
        ]),
        JSON.stringify({ showPercentageInput: true, showThresholds: true }),
        1,
        '1.0',
        adminUserId,
        adminUserId,
        timestamp,
        timestamp
      ]
    );
    console.log(`✅ ATR Responsiveness template created: ${atrTemplateId}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 AIMS INDICATOR SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log('📊 5 Indicators Created:');
    console.log('   1. ICCS Framework (28 points)');
    console.log('   2. Integrity Training (26 points)');
    console.log('   3. Asset Declaration (16 points)');
    console.log('   4. Corruption Cases (20 points)');
    console.log('   5. ATR Responsiveness (10 points)');
    console.log('');
    console.log('📝 5 Form Templates Created:');
    console.log('   1. ICCS Framework Assessment');
    console.log('   2. Integrity Training Assessment');
    console.log('   3. Asset Declaration Compliance Assessment');
    console.log('   4. Corruption Cases Assessment');
    console.log('   5. ATR Responsiveness Assessment');
    console.log('');
    console.log('✅ Prevention officers can now use dynamic forms!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error seeding AIMS indicators:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the script
seedAIMSIndicators().catch(console.error);