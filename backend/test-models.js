require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const models = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20240620',
  'claude-3-sonnet-20240229',
  'claude-sonnet-4-6',
  'claude-sonnet-4.6'
];

async function testModels() {
  for (const model of models) {
    try {
      console.log(`Testing ${model}...`);
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      console.log(`✅ ${model} works!\n`);
      break;
    } catch (error) {
      console.log(`❌ ${model} failed\n`);
    }
  }
}

testModels();
