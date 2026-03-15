#!/usr/bin/env node

// Direct test of Brave Search API integration
import { getBraveSearchAPI } from '../dist/tools/web-search.js';

const apiKey = 'BSAFCa9BRKBDLeW9dHg9ocUMFa1Q-6Z';

async function testSearch() {
  try {
    console.log('🦊 Testing Brave Search API directly');
    
    const braveSearch = getBraveSearchAPI(apiKey);
    
    console.log('1. Quick search test:');
    const results = await braveSearch.quickSearch('OpenAI GPT-4 2026', 3);
    
    console.log(`Found ${results.length} results:`);
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   ${result.url}`);
      console.log(`   ${result.description.substring(0, 100)}...`);
      console.log();
    });
    
    console.log('2. Advanced search test:');
    const advancedResults = await braveSearch.advancedSearch('NVIDIA RTX 4090 specs', {
      count: 2,
      country: 'US'
    });
    
    console.log(`Advanced search found ${advancedResults.web?.results?.length || 0} results`);
    
    console.log('✅ Direct API test successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSearch();