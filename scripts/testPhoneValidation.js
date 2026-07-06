// Test de validation téléphone

const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;

const testCases = [
  // Valides
  { phone: '0612345678', expected: true, label: 'Mobile classique' },
  { phone: '+33612345678', expected: true, label: 'Mobile international' },
  { phone: '0123456789', expected: true, label: 'Fixe classique' },
  { phone: '+33123456789', expected: true, label: 'Fixe international' },

  // Invalides
  { phone: 'aaaaaaaaaa', expected: false, label: 'Lettres uniquement' },
  { phone: '1234567890', expected: false, label: 'Commence par 1' },
  { phone: '06123456', expected: false, label: 'Trop court' },
  { phone: '061234567890', expected: false, label: 'Trop long' },
  { phone: '0012345678', expected: false, label: 'Commence par 00' },
  { phone: '+330612345678', expected: false, label: 'Trop de chiffres après +33' },
  { phone: '06 12 34 56 78', expected: true, label: 'Avec espaces (nettoyé)' },
  { phone: '', expected: false, label: 'Vide' },
  { phone: '0712345678', expected: true, label: 'Mobile 07' },
  { phone: '0912345678', expected: true, label: 'Mobile 09' },
];

console.log('\n🧪 TEST DE VALIDATION TÉLÉPHONE\n');
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const cleanPhone = test.phone.replace(/\s/g, '');
  const result = phoneRegex.test(cleanPhone);
  const success = result === test.expected;

  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.label}`);
    console.log(`   Input: "${test.phone}" → Valide: ${result}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.label}`);
    console.log(`   Input: "${test.phone}" → Attendu: ${test.expected}, Reçu: ${result}`);
    failed++;
  }
  console.log('');
});

console.log('═'.repeat(60));
console.log(`\n📊 RÉSULTATS: ${passed}/${testCases.length} réussis, ${failed} échecs\n`);

if (failed === 0) {
  console.log('✅ Tous les tests sont passés !\n');
  process.exit(0);
} else {
  console.log('❌ Certains tests ont échoué.\n');
  process.exit(1);
}
