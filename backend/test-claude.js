require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function testClaude() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'Dis bonjour en une phrase' }
      ]
    });
    
    console.log('✅ Réponse:', response.content[0].text);
  } catch (error) {
    console.log('❌ Modèle invalide. Test avec claude-3-5-sonnet-latest...\n');
    
    try {
      const response2 = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 100,
        messages: [
          { role: 'user', content: 'Dis bonjour en une phrase' }
        ]
      });
      
      console.log('✅ Réponse:', response2.content[0].text);
      console.log('\n✅ Utilisez le modèle: claude-3-5-sonnet-latest');
    } catch (error2) {
      console.error('❌ Erreur:', error2.message);
    }
  }
}

testClaude();
