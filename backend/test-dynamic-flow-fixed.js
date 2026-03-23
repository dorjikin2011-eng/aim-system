// Use dynamic imports to handle TypeScript modules
async function testDynamicFlow() {
  console.log('=== Testing Complete Dynamic Flow ===\n');
  
  try {
    // 1. First test the database connection
    console.log('1. Testing database connection...');
    const { getDB } = require('./src/models/db');
    const db = getDB();
    console.log('   ✅ Database connected');
    
    // 2. Check template directly via SQL
    console.log('\n2. Checking template via SQL...');
    const { allAsync, getAsync } = require('./src/models/db');
    
    const template = await getAsync(db, 
      'SELECT * FROM form_templates WHERE id = ?', 
      ['template_aims_assessment']
    );
    
    if (!template) {
      throw new Error('Template not found');
    }
    console.log(`   ✅ Template found: ${template.name}`);
    
    // Parse sections
    const sections = JSON.parse(template.sections || '[]');
    console.log(`   Sections: ${sections.length}`);
    
    // Count fields with indicator_id
    const fieldsWithIndicator = sections.flatMap(s => 
      (s.fields || []).filter(f => f.indicator_id)
    );
    console.log(`   Fields with indicator_id: ${fieldsWithIndicator.length}`);
    
    // 3. Check indicator via SQL
    console.log('\n3. Checking indicator via SQL...');
    const indicator = await getAsync(db,
      'SELECT * FROM indicators WHERE id = ?',
      ['ind_iccs']
    );
    
    if (!indicator) {
      throw new Error('Indicator not found');
    }
    console.log(`   ✅ Indicator found: ${indicator.name} (${indicator.code})`);
    
    // Parse parameters and scoring rules
    const parameters = JSON.parse(indicator.parameters || '[]');
    const scoringRules = JSON.parse(indicator.scoring_rules || '[]');
    console.log(`   Parameters: ${parameters.length}`);
    console.log(`   Scoring Rules: ${scoringRules.length}`);
    
    // 4. Test FormGenerator via direct require (if compiled)
    console.log('\n4. Testing if FormGenerator exists...');
    try {
      // Try to load compiled version
      const FormGenerator = require('./dist/utils/FormGenerator').FormGenerator;
      console.log('   ✅ FormGenerator found (compiled)');
      
      // Test generateForm
      console.log('\n5. Testing FormGenerator.generateForm()...');
      const form = await FormGenerator.generateForm('template_aims_assessment');
      console.log(`   ✅ Form generated: ${form.sections?.length} sections`);
      
    } catch (formGenError) {
      console.log('   ⚠️ FormGenerator not found in dist/, trying src/...');
      
      try {
        // Try TypeScript source (requires ts-node)
        const { FormGenerator } = require('./src/utils/FormGenerator');
        console.log('   ✅ FormGenerator found (TypeScript source)');
        
        // Test with sample data
        console.log('\n5. Testing with sample form data...');
        
        const testFormData = {
          agency_name: "Test Agency",
          fiscal_year: "2024-25",
          contact_person: "John Doe",
          complaint_exists: true,
          complaint_functioning: true,
          conflict_exists: true,
          conflict_functioning: true,
          gift_exists: true,
          gift_functioning: true,
          proactive_measures: "level1"
        };
        
        // Try calculateScore
        const scoreResult = await FormGenerator.calculateScore(
          testFormData, 
          'template_aims_assessment'
        );
        
        console.log(`   ✅ Score calculation successful!`);
        console.log(`   Total Score: ${scoreResult.totalScore}`);
        console.log(`   Integrity Level: ${scoreResult.integrityLevel}`);
        
        // Calculate expected score
        const maxScore = indicator.max_score || 100;
        const weight = indicator.weight || 0;
        console.log(`\n   Indicator weight: ${weight}%`);
        console.log(`   Max score: ${maxScore}`);
        
        // Manual calculation check
        const expectedPoints = 3+4+3+4+3+4+7; // 28 points
        const expectedWeighted = (expectedPoints / maxScore) * weight;
        console.log(`   Expected raw: ${expectedPoints}/${maxScore}`);
        console.log(`   Expected weighted: ${expectedWeighted.toFixed(2)}`);
        
      } catch (tsError) {
        console.log(`   ❌ Cannot load FormGenerator: ${tsError.message}`);
        console.log('   Try running with: npx ts-node test-dynamic-flow.js');
      }
    }
    
    // 5. Manual scoring test
    console.log('\n6. Manual scoring test...');
    
    // Parse scoring rules and show them
    console.log('   Scoring Rules Breakdown:');
    scoringRules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.parameter_code} ${rule.condition} → ${rule.points} pts`);
    });
    
    // Simulate perfect score
    const perfectScore = scoringRules
      .filter(rule => {
        // Check which rules would apply for perfect case
        if (rule.parameter_code === 'proactive_measures') {
          return rule.condition === 'proactive_measures == "level1"';
        }
        // All boolean fields true
        return rule.condition.includes('== true');
      })
      .reduce((sum, rule) => sum + (rule.points || 0), 0);
    
    console.log(`\n   Perfect score calculation: ${perfectScore} points`);
    console.log(`   (Should be 28 for ICCS)`);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testDynamicFlow();