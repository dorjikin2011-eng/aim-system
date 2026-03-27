// backend/src/scripts/seed-aims-complete.ts
// @ts-nocheck
import { IndicatorConfig } from '../models/IndicatorConfig';
import { ParameterDefinition } from '../models/ParameterDefinition';
import { ScoringRule } from '../models/ScoringRule';
import { FormTemplate } from '../models/FormTemplate';

/**
 * Complete AIMS Baseline Configuration Seed
 * Creates all 5 indicators with parameters, scoring rules, and forms
 * Compatible with AIMS Implementation Guideline 2025-Rev2
 */

async function seedAIMSComplete() {
  console.log('🚀 Starting Complete AIMS Configuration Seed...\n');

  try {
    // Clear existing data first
    await clearExistingData();
    
    // Create all components
    await createAllIndicators();
    await createAllParameters();
    await createAllScoringRules();
    await createAllFormTemplates();
    
    console.log('\n✅ AIMS Configuration Complete!');
    console.log('📊 5 Indicators, 17 Parameters, 24 Scoring Rules, 2 Form Templates');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

async function clearExistingData() {
  console.log('🗑️  Clearing existing data...');
  
  // Use truncate() method which is standard in Sequelize models
  // Wrap in try-catch to handle missing methods gracefully
  try {
    await (ScoringRule as any).truncate?.() || await (ScoringRule as any).destroy?.({ where: {}, truncate: true });
  } catch (e) {
    console.log('⚠️  Could not truncate ScoringRules - continuing...');
  }
  
  try {
    await (ParameterDefinition as any).truncate?.() || await (ParameterDefinition as any).destroy?.({ where: {}, truncate: true });
  } catch (e) {
    console.log('⚠️  Could not truncate ParameterDefinitions - continuing...');
  }
  
  try {
    await (IndicatorConfig as any).truncate?.() || await (IndicatorConfig as any).destroy?.({ where: {}, truncate: true });
  } catch (e) {
    console.log('⚠️  Could not truncate IndicatorConfigs - continuing...');
  }
  
  try {
    await (FormTemplate as any).truncate?.() || await (FormTemplate as any).destroy?.({ where: {}, truncate: true });
  } catch (e) {
    console.log('⚠️  Could not truncate FormTemplates - continuing...');
  }
  
  console.log('✅ Data cleared\n');
}

async function createAllIndicators() {
  console.log('📈 Creating Indicators...');
  
  const indicators = [
    // ICCS
    {
      id: 'ind_iccs',
      code: 'ICCS',
      name: 'Internal Corruption Control Systems (ICCS)',
      description: 'Functioning of the agency\'s four core integrity systems',
      weight: 28,
      maxScore: 28,
      category: 'integrity_promotion',
      isActive: true,
      displayOrder: 1,
      scoringMethod: 'system_status',
      calculationConfig: {
        scoringType: 'system_status',
        systems: 4,
        pointsPerSystem: 7,
        proactiveLevels: { full: 7, baseline: 3, zero: 0 }
      },
      dataSources: ['ACC', 'Agency Records'],
      assessmentFrequency: 'annual',
      parameters: [],
      scoringRules: [],
      uiConfig: {},
      metadata: {},
      createdBy: 'system',
      updatedBy: 'system'
    },
    // Training
    {
      id: 'ind_training',
      code: 'TRAINING',
      name: 'Integrity Capacity Building',
      description: 'Staff Training & Awareness + ACC\'s e-Learning completion',
      weight: 26,
      maxScore: 26,
      category: 'integrity_promotion',
      isActive: true,
      displayOrder: 2,
      scoringMethod: 'percentage',
      calculationConfig: {
        scoringType: 'percentage',
        numeratorField: 'completed_employees',
        denominatorField: 'total_employees',
        thresholds: [
          { min: 85, score: 26 },
          { min: 70, max: 84, score: 18 },
          { min: 50, max: 69, score: 10 },
          { max: 49, score: 0 }
        ]
      },
      dataSources: ['ACC'],
      assessmentFrequency: 'annual',
      parameters: [],
      scoringRules: [],
      uiConfig: {},
      metadata: {},
      createdBy: 'system',
      updatedBy: 'system'
    },
    // AD
    {
      id: 'ind_ad',
      code: 'AD',
      name: 'Asset Declaration (AD) Compliance',
      description: '% of covered officials submitting AD on time',
      weight: 16,
      maxScore: 16,
      category: 'integrity_promotion',
      isActive: true,
      displayOrder: 3,
      scoringMethod: 'percentage',
      calculationConfig: {
        scoringType: 'percentage',
        numeratorField: 'officials_submitted_on_time',
        denominatorField: 'total_covered_officials',
        thresholds: [
          { min: 100, score: 16 },
          { min: 95, max: 99, score: 10 },
          { min: 90, max: 94, score: 5 },
          { max: 89, score: 0 }
        ]
      },
      dataSources: ['ACC'],
      assessmentFrequency: 'annual',
      parameters: [],
      scoringRules: [],
      uiConfig: {},
      metadata: {},
      createdBy: 'system',
      updatedBy: 'system'
    },
    // Cases
    {
      id: 'ind_cases',
      code: 'CASES',
      name: 'Corruption Case Severity & Resolution',
      description: 'Weighted severity of corruption cases involving agency staff',
      weight: 20,
      maxScore: 20,
      category: 'corruption_accountability',
      isActive: true,
      displayOrder: 4,
      scoringMethod: 'weighted_sum',
      calculationConfig: {
        scoringType: 'weighted_sum',
        weights: { convictions: 3, prosecutions: 2, admin_actions: 1 },
        thresholds: [
          { max: 0, score: 20 },
          { min: 1, max: 2, score: 10 },
          { min: 3, max: 4, score: 5 },
          { min: 5, score: 0 }
        ]
      },
      dataSources: ['ACC'],
      assessmentFrequency: 'annual',
      parameters: [],
      scoringRules: [],
      uiConfig: {},
      metadata: {},
      createdBy: 'system',
      updatedBy: 'system'
    },
    // ATR
    {
      id: 'ind_atr',
      code: 'ATR',
      name: 'ATR Responsiveness',
      description: '% of ATRs submitted by agency within ACC\'s deadlines',
      weight: 10,
      maxScore: 10,
      category: 'corruption_accountability',
      isActive: true,
      displayOrder: 5,
      scoringMethod: 'percentage',
      calculationConfig: {
        scoringType: 'percentage',
        numeratorField: 'atrs_submitted_on_time',
        denominatorField: 'total_atrs',
        thresholds: [
          { min: 90, score: 10 },
          { min: 70, max: 89, score: 7 },
          { max: 69, score: 3 }
        ]
      },
      dataSources: ['ACC'],
      assessmentFrequency: 'annual',
      parameters: [],
      scoringRules: [],
      uiConfig: {},
      metadata: {},
      createdBy: 'system',
      updatedBy: 'system'
    }
  ];

  for (const data of indicators) {
    // Pass objects directly - Sequelize model should handle JSON serialization via hooks
    await IndicatorConfig.create({
      ...data,
      calculationConfig: JSON.stringify(data.calculationConfig),
      dataSources: JSON.stringify(data.dataSources),
      parameters: JSON.stringify(data.parameters),
      scoringRules: JSON.stringify(data.scoringRules),
      uiConfig: JSON.stringify(data.uiConfig),
      metadata: JSON.stringify(data.metadata)
    } as any); // Type assertion for Sequelize compatibility
    
    console.log(`  ✅ ${data.name} (${data.weight}%)`);
  }
}

async function createAllParameters() {
  console.log('\n📝 Creating Parameters...');
  
  const parameters = [
    // ICCS Parameters (7)
    { indicatorId: 'ind_iccs', code: 'complaint_exists', label: 'Complaint Management Mechanism Exists', type: 'boolean', required: true, displayOrder: 1, options: null },
    { indicatorId: 'ind_iccs', code: 'complaint_functions', label: 'Complaint Management Mechanism Functioning', type: 'boolean', required: true, displayOrder: 2, options: null },
    { indicatorId: 'ind_iccs', code: 'conflict_exists', label: 'Conflict of Interest Declaration System Exists', type: 'boolean', required: true, displayOrder: 3, options: null },
    { indicatorId: 'ind_iccs', code: 'conflict_functions', label: 'Conflict of Interest System Functioning', type: 'boolean', required: true, displayOrder: 4, options: null },
    { indicatorId: 'ind_iccs', code: 'gift_exists', label: 'Gift Register & Reporting System Exists', type: 'boolean', required: true, displayOrder: 5, options: null },
    { indicatorId: 'ind_iccs', code: 'gift_functions', label: 'Gift Register System Functioning', type: 'boolean', required: true, displayOrder: 6, options: null },
    { 
      indicatorId: 'ind_iccs', 
      code: 'proactive_level', 
      label: 'ACC Recommendations / Proactive Measures', 
      type: 'select', 
      required: true, 
      displayOrder: 7,
      options: JSON.stringify([
        { value: 'full', label: 'Present & Functioning (7 pts)' },
        { value: 'baseline', label: 'No ACC Recommendations (3 pts)' },
        { value: 'zero', label: 'ACC Recommendations Not Implemented (0 pts)' }
      ]) 
    },
    
    // Training Parameters (2)
    { indicatorId: 'ind_training', code: 'total_employees', label: 'Total Number of Employees', type: 'number', required: true, displayOrder: 1, min: 0, options: null },
    { indicatorId: 'ind_training', code: 'completed_employees', label: 'Employees Completed ACC e-Learning', type: 'number', required: true, displayOrder: 2, min: 0, options: null },
    
    // AD Parameters (2)
    { indicatorId: 'ind_ad', code: 'total_covered_officials', label: 'Total Covered Officials', type: 'number', required: true, displayOrder: 1, min: 0, options: null },
    { indicatorId: 'ind_ad', code: 'officials_submitted_on_time', label: 'Officials Submitted AD on Time', type: 'number', required: true, displayOrder: 2, min: 0, options: null },
    
    // Cases Parameters (3)
    { indicatorId: 'ind_cases', code: 'convictions', label: 'Number of Convictions', type: 'number', required: true, displayOrder: 1, min: 0, default: 0, options: null },
    { indicatorId: 'ind_cases', code: 'prosecutions', label: 'Number of Prosecutions/OAG Referrals', type: 'number', required: true, displayOrder: 2, min: 0, default: 0, options: null },
    { indicatorId: 'ind_cases', code: 'admin_actions', label: 'Number of ACC-confirmed Administrative Actions', type: 'number', required: true, displayOrder: 3, min: 0, default: 0, options: null },
    
    // ATR Parameters (2)
    { indicatorId: 'ind_atr', code: 'total_atrs', label: 'Total ATRs Received', type: 'number', required: true, displayOrder: 1, min: 0, options: null },
    { indicatorId: 'ind_atr', code: 'atrs_submitted_on_time', label: 'ATRs Submitted on Time', type: 'number', required: true, displayOrder: 2, min: 0, options: null }
  ];

  for (const data of parameters) {
    await ParameterDefinition.create(data as any);
    console.log(`  ✅ ${data.label} (${data.code})`);
  }
}

async function createAllScoringRules() {
  console.log('\n🎯 Creating Scoring Rules...');
  
  const rules = [
    // ICCS Rules (9) - all have parameterCode
    { indicatorId: 'ind_iccs', parameterCode: 'complaint_exists', condition: 'value === true', points: 3, description: 'Complaint system exists', displayOrder: 1 },
    { indicatorId: 'ind_iccs', parameterCode: 'complaint_functions', condition: 'value === true', points: 4, description: 'Complaint system functioning', displayOrder: 2 },
    { indicatorId: 'ind_iccs', parameterCode: 'conflict_exists', condition: 'value === true', points: 3, description: 'Conflict system exists', displayOrder: 3 },
    { indicatorId: 'ind_iccs', parameterCode: 'conflict_functions', condition: 'value === true', points: 4, description: 'Conflict system functioning', displayOrder: 4 },
    { indicatorId: 'ind_iccs', parameterCode: 'gift_exists', condition: 'value === true', points: 3, description: 'Gift system exists', displayOrder: 5 },
    { indicatorId: 'ind_iccs', parameterCode: 'gift_functions', condition: 'value === true', points: 4, description: 'Gift system functioning', displayOrder: 6 },
    { indicatorId: 'ind_iccs', parameterCode: 'proactive_level', condition: 'value === "full"', points: 7, description: 'ACC recommendations present & functioning', displayOrder: 7 },
    { indicatorId: 'ind_iccs', parameterCode: 'proactive_level', condition: 'value === "baseline"', points: 3, description: 'No ACC recommendations', displayOrder: 8 },
    { indicatorId: 'ind_iccs', parameterCode: 'proactive_level', condition: 'value === "zero"', points: 0, description: 'ACC recommendations not implemented', displayOrder: 9 },
    
    // Training Rules (4) - NO parameterCode (percentage-based)
    { indicatorId: 'ind_training', parameterCode: null, condition: 'percentage >= 85', points: 26, description: '85% or more completed e-Learning', displayOrder: 1 },
    { indicatorId: 'ind_training', parameterCode: null, condition: 'percentage >= 70 && percentage <= 84', points: 18, description: '70-84% completed e-Learning', displayOrder: 2 },
    { indicatorId: 'ind_training', parameterCode: null, condition: 'percentage >= 50 && percentage <= 69', points: 10, description: '50-69% completed e-Learning', displayOrder: 3 },
    { indicatorId: 'ind_training', parameterCode: null, condition: 'percentage < 50', points: 0, description: 'Less than 50% completed e-Learning', displayOrder: 4 },
    
    // AD Rules (4) - NO parameterCode (percentage-based)
    { indicatorId: 'ind_ad', parameterCode: null, condition: 'percentage === 100', points: 16, description: '100% AD compliance', displayOrder: 1 },
    { indicatorId: 'ind_ad', parameterCode: null, condition: 'percentage >= 95 && percentage <= 99', points: 10, description: '95-99% AD compliance', displayOrder: 2 },
    { indicatorId: 'ind_ad', parameterCode: null, condition: 'percentage >= 90 && percentage <= 94', points: 5, description: '90-94% AD compliance', displayOrder: 3 },
    { indicatorId: 'ind_ad', parameterCode: null, condition: 'percentage < 90', points: 0, description: 'Less than 90% AD compliance', displayOrder: 4 },
    
    // Cases Rules (4) - NO parameterCode (weighted sum)
    { indicatorId: 'ind_cases', parameterCode: null, condition: 'weightedSum <= 0', points: 20, description: 'No corruption cases', displayOrder: 1 },
    { indicatorId: 'ind_cases', parameterCode: null, condition: 'weightedSum >= 1 && weightedSum <= 2', points: 10, description: 'Low case severity', displayOrder: 2 },
    { indicatorId: 'ind_cases', parameterCode: null, condition: 'weightedSum >= 3 && weightedSum <= 4', points: 5, description: 'Moderate case severity', displayOrder: 3 },
    { indicatorId: 'ind_cases', parameterCode: null, condition: 'weightedSum >= 5', points: 0, description: 'High case severity', displayOrder: 4 },
    
    // ATR Rules (3) - NO parameterCode (percentage-based)
    { indicatorId: 'ind_atr', parameterCode: null, condition: 'percentage >= 90', points: 10, description: '90% or more ATRs on time', displayOrder: 1 },
    { indicatorId: 'ind_atr', parameterCode: null, condition: 'percentage >= 70 && percentage <= 89', points: 7, description: '70-89% ATRs on time', displayOrder: 2 },
    { indicatorId: 'ind_atr', parameterCode: null, condition: 'percentage < 70', points: 3, description: 'Less than 70% ATRs on time', displayOrder: 3 }
  ];

  for (const data of rules) {
    // Ensure parameterCode is never undefined (use null for rules without parameters)
    const ruleData = {
      ...data,
      parameterCode: data.parameterCode ?? null
    };
    await ScoringRule.create(ruleData as any);
    console.log(`  ✅ ${data.description} (${data.points} pts)`);
  }
}

async function createAllFormTemplates() {
  console.log('\n📄 Creating Form Templates...');
  
  // 1. Complete Assessment Template
  const aimsTemplate = {
    id: 'tpl_aims_complete',
    name: 'AIMS Complete Assessment Form',
    description: 'Complete assessment form for all 5 AIMS indicators',
    templateType: 'assessment',
    indicatorIds: ['ind_iccs', 'ind_training', 'ind_ad', 'ind_cases', 'ind_atr'],
    sections: [
      {
        id: 'section_integrity',
        title: 'Integrity Promotion Indicators',
        displayOrder: 1,
        fields: [
          { id: 'f1', label: 'Complaint System Exists', type: 'boolean', parameterCode: 'complaint_exists', required: true, displayOrder: 1 },
          { id: 'f2', label: 'Complaint System Functions', type: 'boolean', parameterCode: 'complaint_functions', required: true, displayOrder: 2 },
          { id: 'f3', label: 'Conflict System Exists', type: 'boolean', parameterCode: 'conflict_exists', required: true, displayOrder: 3 },
          { id: 'f4', label: 'Conflict System Functions', type: 'boolean', parameterCode: 'conflict_functions', required: true, displayOrder: 4 },
          { id: 'f5', label: 'Gift System Exists', type: 'boolean', parameterCode: 'gift_exists', required: true, displayOrder: 5 },
          { id: 'f6', label: 'Gift System Functions', type: 'boolean', parameterCode: 'gift_functions', required: true, displayOrder: 6 },
          { 
            id: 'f7', 
            label: 'ACC Recommendations Status', 
            type: 'select', 
            parameterCode: 'proactive_level', 
            required: true, 
            displayOrder: 7,
            options: [
              { value: 'full', label: 'Present & Functioning (7 pts)' },
              { value: 'baseline', label: 'No ACC Recommendations (3 pts)' },
              { value: 'zero', label: 'ACC Recommendations Not Implemented (0 pts)' }
            ]
          }
        ]
      },
      {
        id: 'section_training',
        title: 'Training Data',
        displayOrder: 2,
        fields: [
          { id: 'f8', label: 'Total Employees', type: 'number', parameterCode: 'total_employees', required: true, displayOrder: 1, min: 0 },
          { id: 'f9', label: 'Completed e-Learning', type: 'number', parameterCode: 'completed_employees', required: true, displayOrder: 2, min: 0 }
        ]
      },
      {
        id: 'section_ad',
        title: 'Asset Declaration Compliance',
        displayOrder: 3,
        fields: [
          { id: 'f10', label: 'Total Covered Officials', type: 'number', parameterCode: 'total_covered_officials', required: true, displayOrder: 1, min: 0 },
          { id: 'f11', label: 'Officials Submitted AD on Time', type: 'number', parameterCode: 'officials_submitted_on_time', required: true, displayOrder: 2, min: 0 }
        ]
      },
      {
        id: 'section_cases',
        title: 'Corruption Cases',
        displayOrder: 4,
        fields: [
          { id: 'f12', label: 'Number of Convictions', type: 'number', parameterCode: 'convictions', required: true, displayOrder: 1, min: 0, default: 0 },
          { id: 'f13', label: 'Number of Prosecutions/OAG Referrals', type: 'number', parameterCode: 'prosecutions', required: true, displayOrder: 2, min: 0, default: 0 },
          { id: 'f14', label: 'Number of ACC-confirmed Administrative Actions', type: 'number', parameterCode: 'admin_actions', required: true, displayOrder: 3, min: 0, default: 0 }
        ]
      },
      {
        id: 'section_atr',
        title: 'ATR Responsiveness',
        displayOrder: 5,
        fields: [
          { id: 'f15', label: 'Total ATRs Received', type: 'number', parameterCode: 'total_atrs', required: true, displayOrder: 1, min: 0 },
          { id: 'f16', label: 'ATRs Submitted on Time', type: 'number', parameterCode: 'atrs_submitted_on_time', required: true, displayOrder: 2, min: 0 }
        ]
      }
    ],
    validationRules: { requireAllFields: true },
    uiConfig: { 
      showScoreCalculations: true,
      enableAutoSave: true,
      sectionCollapsible: true,
      showProgressTracker: true
    },
    scoringConfig: {
      enableAutoScoring: true,
      showCalculatedScores: true,
      allowManualOverride: false,
      autoCalculateOnChange: true
    },
    version: '1.0.0',
    isActive: true,
    createdBy: 'system',
    updatedBy: 'system'
  };

  // Convert nested objects to JSON strings for database storage
  await FormTemplate.create({
    ...aimsTemplate,
    indicatorIds: JSON.stringify(aimsTemplate.indicatorIds),
    sections: JSON.stringify(aimsTemplate.sections),
    validationRules: JSON.stringify(aimsTemplate.validationRules),
    uiConfig: JSON.stringify(aimsTemplate.uiConfig),
    scoringConfig: JSON.stringify(aimsTemplate.scoringConfig)
  } as any);
  
  console.log(`  ✅ AIMS Complete Assessment Form`);

  // 2. Test Template
  const testTemplate = {
    id: 'tpl_aims_test',
    name: 'AIMS Test Form',
    description: 'Test form for AIMS configuration',
    templateType: 'test',
    indicatorIds: ['ind_iccs'],
    sections: [
      {
        id: 'section_test',
        title: 'Test Section',
        displayOrder: 1,
        fields: [
          { 
            id: 'tf1', 
            label: 'ACC Recommendations Status', 
            type: 'select', 
            parameterCode: 'proactive_level', 
            required: false, 
            displayOrder: 1,
            options: [
              { value: 'full', label: 'Present & Functioning (7 pts)' },
              { value: 'baseline', label: 'No ACC Recommendations (3 pts)' },
              { value: 'zero', label: 'ACC Recommendations Not Implemented (0 pts)' }
            ]
          }
        ]
      }
    ],
    validationRules: { requireAllFields: false },
    uiConfig: { showDebugInfo: true },
    scoringConfig: {
      enableAutoScoring: true,
      showCalculatedScores: true,
      allowManualOverride: true,
      autoCalculateOnChange: true
    },
    version: '1.0.0',
    isActive: true,
    createdBy: 'system',
    updatedBy: 'system'
  };

  await FormTemplate.create({
    ...testTemplate,
    indicatorIds: JSON.stringify(testTemplate.indicatorIds),
    sections: JSON.stringify(testTemplate.sections),
    validationRules: JSON.stringify(testTemplate.validationRules),
    uiConfig: JSON.stringify(testTemplate.uiConfig),
    scoringConfig: JSON.stringify(testTemplate.scoringConfig)
  } as any);
  
  console.log(`  ✅ AIMS Test Form`);
}

// Run the seed
seedAIMSComplete().catch((error) => {
  console.error('❌ Fatal error in seed script:', error);
  process.exit(1);
});