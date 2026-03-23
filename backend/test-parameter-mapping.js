const { IndicatorConfig } = require('./src/models/IndicatorConfig');

async function testParameterMapping() {
  console.log('=== Testing Parameter Code Mapping ===\n');
  
  const iccs = await IndicatorConfig.getById('ind_iccs');
  
  if (iccs.scoringRules && iccs.scoringRules.length > 0) {
    const firstRule = iccs.scoringRules[0];
    
    console.log('First scoring rule object:');
    console.log(JSON.stringify(firstRule, null, 2));
    
    console.log('\nKey analysis:');
    console.log(`Has parameterCode: ${'parameterCode' in firstRule} (value: ${firstRule.parameterCode})`);
    console.log(`Has parameter_code: ${'parameter_code' in firstRule} (value: ${firstRule['parameter_code']})`);
    console.log(`All keys: ${Object.keys(firstRule).join(', ')}`);
    
    // Check the actual value
    console.log('\nDirect property access:');
    console.log(`firstRule.parameterCode = ${firstRule.parameterCode}`);
    console.log(`firstRule['parameter_code'] = ${firstRule['parameter_code']}`);
    
    // Test FormGenerator evaluateCondition
    console.log('\nTesting condition evaluation...');
    
    // Simple test without requiring FormGenerator
    const testData = { complaint_exists: true };
    const condition = firstRule.condition;
    
    console.log(`Condition: ${condition}`);
    console.log(`Test data: ${JSON.stringify(testData)}`);
    
    // Simple evaluation
    if (condition === 'complaint_exists == true') {
      console.log('✅ Condition matches expected format');
      console.log(`Value in testData: ${testData['complaint_exists']}`);
      console.log(`Evaluation: ${testData['complaint_exists'] === true}`);
    }
  }
}

testParameterMapping().catch(console.error);