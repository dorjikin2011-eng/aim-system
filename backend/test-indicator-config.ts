// backend/test-indicator-config.ts
import { IndicatorConfig } from './src/models/IndicatorConfig';

async function testIndicatorConfig() {
  try {
    console.log('🧪 Testing IndicatorConfig model...');
    
    // Test 1: Get all indicators
    console.log('1. Getting all indicators...');
    const indicators = await IndicatorConfig.getAll();
    console.log(`   ✅ Found ${indicators.length} indicators`);
    
    // Test 2: Get by ID (use first indicator if exists)
    if (indicators.length > 0) {
      console.log(`2. Getting indicator ${indicators[0].id}...`);
      const indicator = await IndicatorConfig.getById(indicators[0].id);
      console.log(`   ✅ Found: ${indicator?.name}`);
    }
    
    // Test 3: Get configuration versions
    console.log('3. Getting configuration versions...');
    const versions = await IndicatorConfig.getConfigurationVersions();
    console.log(`   ✅ Found ${versions.length} configuration versions`);
    
    console.log('\n🎉 IndicatorConfig model test PASSED!');
  } catch (error) {
    console.error('❌ IndicatorConfig model test FAILED:', error);
  }
}

testIndicatorConfig();