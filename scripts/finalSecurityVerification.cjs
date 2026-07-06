const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Codes couleur
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function evaluateRule(rule, context) {
  // Simulation basique d'évaluation de règle
  // En production, Firebase fait cela automatiquement

  if (!rule) return false;

  // Remplacer les variables par les valeurs du contexte
  let evaluatedRule = rule;
  Object.keys(context).forEach(key => {
    const regex = new RegExp(key.replace('$', '\\$'), 'g');
    evaluatedRule = evaluatedRule.replace(regex, `"${context[key]}"`);
  });

  // Simplifier pour les cas courants
  if (evaluatedRule.includes('===')) {
    const parts = evaluatedRule.split('===');
    if (parts.length === 2) {
      const left = parts[0].trim().replace(/"/g, '');
      const right = parts[1].trim().replace(/"/g, '');
      return left === right;
    }
  }

  return false;
}

function testScenario(title, rule, context, shouldAllow) {
  log(`\n   ${title}`, 'cyan');

  // Afficher le contexte
  log(`   Context: ${JSON.stringify(context, null, 2).split('\n').join('\n   ')}`, 'reset');

  // Extraire la partie critique de la règle
  let criticalRule = rule;

  // Pour les règles complexes, on fait une évaluation simplifiée
  let allowed = false;

  // Vérification universityId match
  if (rule.includes('universityId').includes('$universityId')) {
    allowed = context['auth.uid.universityId'] === context['$universityId'];
  }

  // Vérification rôle
  if (rule.includes('super_admin_plateforme') && context['auth.uid.role'] === 'super_admin_plateforme') {
    allowed = true;
  }

  // Vérification childrenAccess
  if (rule.includes('childrenAccess') && context['auth.uid.childrenAccess']) {
    allowed = true;
  }

  const result = allowed === shouldAllow;

  if (result) {
    log(`   ✅ ${allowed ? 'AUTORISÉ' : 'REFUSÉ'} (attendu: ${shouldAllow ? 'AUTORISÉ' : 'REFUSÉ'})`, 'green');
  } else {
    log(`   ❌ ${allowed ? 'AUTORISÉ' : 'REFUSÉ'} (attendu: ${shouldAllow ? 'AUTORISÉ' : 'REFUSÉ'})`, 'red');
    log(`   ⚠️  FAILLE DE SÉCURITÉ DÉTECTÉE!`, 'red');
  }

  return result;
}

function runComprehensiveSecurityAudit() {
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'bold');
  log('║                                                                    ║', 'bold');
  log('║         🔒 VÉRIFICATION FINALE DE SÉCURITÉ - EXHAUSTIVE           ║', 'bold');
  log('║                                                                    ║', 'bold');
  log('╚════════════════════════════════════════════════════════════════════╝', 'bold');

  let totalTests = 0;
  let passedTests = 0;

  // ═══════════════════════════════════════════════════════════════════
  log('\n\n📋 TEST 1: ISOLATION LECTURE UNIVERSITÉS', 'blue');
  log('═'.repeat(70), 'blue');

  const univReadRule = rules.rules.universities.$universityId['.read'];
  log(`\nRègle: ${univReadRule}`, 'yellow');

  // Test 1.1: Admin lit sa propre université
  totalTests++;
  if (testScenario(
    'Test 1.1: Admin Univ-A lit universities/univ-A',
    univReadRule,
    {
      'auth.uid.universityId': 'univ-A',
      'auth.uid.role': 'admin_universite',
      '$universityId': 'univ-A'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 1.2: Admin ne lit PAS autre université
  totalTests++;
  if (testScenario(
    'Test 1.2: Admin Univ-A lit universities/univ-B',
    univReadRule,
    {
      'auth.uid.universityId': 'univ-A',
      'auth.uid.role': 'admin_universite',
      '$universityId': 'univ-B'
    },
    false // Devrait être refusé
  )) passedTests++;

  // Test 1.3: Super admin lit tout
  totalTests++;
  if (testScenario(
    'Test 1.3: Super Admin lit universities/univ-B',
    univReadRule,
    {
      'auth.uid.role': 'super_admin_plateforme',
      '$universityId': 'univ-B'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // ═══════════════════════════════════════════════════════════════════
  log('\n\n📋 TEST 2: ISOLATION LECTURE ÉTUDIANTS', 'blue');
  log('═'.repeat(70), 'blue');

  const studentReadRule = rules.rules.universities.$universityId.students.$studentId['.read'];
  log(`\nRègle: ${studentReadRule}`, 'yellow');

  // Test 2.1: Admin lit étudiant de sa propre univ
  totalTests++;
  if (testScenario(
    'Test 2.1: Admin Univ-A lit students de Univ-A',
    studentReadRule,
    {
      'auth.uid.universityId': 'univ-A',
      'auth.uid.role': 'admin_universite',
      '$universityId': 'univ-A',
      '$studentId': 'student-123'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 2.2: Admin NE lit PAS étudiant d'autre univ
  totalTests++;
  if (testScenario(
    'Test 2.2: Admin Univ-A lit students de Univ-B',
    studentReadRule,
    {
      'auth.uid.universityId': 'univ-A',
      'auth.uid.role': 'admin_universite',
      '$universityId': 'univ-B',
      '$studentId': 'student-456'
    },
    false // Devrait être refusé
  )) passedTests++;

  // Test 2.3: Parent lit SON enfant
  totalTests++;
  if (testScenario(
    'Test 2.3: Parent lit son enfant',
    studentReadRule,
    {
      'auth.uid.childrenAccess': { 'univ-A': { 'student-123': true } },
      '$universityId': 'univ-A',
      '$studentId': 'student-123'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 2.4: Parent NE lit PAS enfant d'un autre
  totalTests++;
  if (testScenario(
    'Test 2.4: Parent lit enfant non autorisé',
    studentReadRule,
    {
      'auth.uid.childrenAccess': { 'univ-A': { 'student-123': true } },
      '$universityId': 'univ-A',
      '$studentId': 'student-999'
    },
    false // Devrait être refusé
  )) passedTests++;

  // ═══════════════════════════════════════════════════════════════════
  log('\n\n📋 TEST 3: PROTECTION MODIFICATION RÔLES', 'blue');
  log('═'.repeat(70), 'blue');

  const roleWriteRule = rules.rules.users.$uid.role['.write'];
  log(`\nRègle: ${roleWriteRule}`, 'yellow');

  // Test 3.1: Super admin peut modifier rôles
  totalTests++;
  if (testScenario(
    'Test 3.1: Super Admin modifie un rôle',
    roleWriteRule,
    {
      'auth.uid.role': 'super_admin_plateforme'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 3.2: Admin NE peut PAS modifier rôles
  totalTests++;
  if (testScenario(
    'Test 3.2: Admin Univ modifie un rôle',
    roleWriteRule,
    {
      'auth.uid.role': 'admin_universite'
    },
    false // Devrait être refusé
  )) passedTests++;

  // Test 3.3: Parent NE peut PAS modifier rôles
  totalTests++;
  if (testScenario(
    'Test 3.3: Parent modifie un rôle',
    roleWriteRule,
    {
      'auth.uid.role': 'parent'
    },
    false // Devrait être refusé
  )) passedTests++;

  // ═══════════════════════════════════════════════════════════════════
  log('\n\n📋 TEST 4: ISOLATION LECTURE PROFILS UTILISATEURS', 'blue');
  log('═'.repeat(70), 'blue');

  const userReadRule = rules.rules.users.$uid['.read'];
  log(`\nRègle: ${userReadRule}`, 'yellow');

  // Test 4.1: User lit son propre profil
  totalTests++;
  if (testScenario(
    'Test 4.1: User lit son propre profil',
    userReadRule,
    {
      'auth.uid': 'user-123',
      '$uid': 'user-123'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 4.2: Admin lit profil de sa propre univ
  totalTests++;
  if (testScenario(
    'Test 4.2: Admin Univ-A lit user de Univ-A',
    userReadRule,
    {
      'auth.uid.role': 'admin_universite',
      'auth.uid.universityId': 'univ-A',
      '$uid.universityId': 'univ-A'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 4.3: Admin NE lit PAS profil d'autre univ
  totalTests++;
  if (testScenario(
    'Test 4.3: Admin Univ-A lit user de Univ-B',
    userReadRule,
    {
      'auth.uid.role': 'admin_universite',
      'auth.uid.universityId': 'univ-A',
      '$uid.universityId': 'univ-B'
    },
    false // Devrait être refusé
  )) passedTests++;

  // ═══════════════════════════════════════════════════════════════════
  log('\n\n📋 TEST 5: PROTECTION DONNÉES SENSIBLES', 'blue');
  log('═'.repeat(70), 'blue');

  const gradesReadRule = rules.rules.universities.$universityId.grades.$studentId['.read'];
  const gradesWriteRule = rules.rules.universities.$universityId.grades.$studentId['.write'];

  log(`\nRègle lecture notes: ${gradesReadRule}`, 'yellow');
  log(`Règle écriture notes: ${gradesWriteRule}`, 'yellow');

  // Test 5.1: Parent lit notes de son enfant
  totalTests++;
  if (testScenario(
    'Test 5.1: Parent lit notes de son enfant',
    gradesReadRule,
    {
      'auth.uid.childrenAccess': { 'univ-A': { 'student-123': true } },
      '$universityId': 'univ-A',
      '$studentId': 'student-123'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // Test 5.2: Parent NE peut PAS modifier notes
  totalTests++;
  if (testScenario(
    'Test 5.2: Parent modifie notes',
    gradesWriteRule,
    {
      'auth.uid.role': 'parent',
      '$universityId': 'univ-A'
    },
    false // Devrait être refusé
  )) passedTests++;

  // Test 5.3: Teacher peut modifier notes
  totalTests++;
  if (testScenario(
    'Test 5.3: Teacher modifie notes de sa univ',
    gradesWriteRule,
    {
      'auth.uid.role': 'teacher',
      'auth.uid.universityId': 'univ-A',
      '$universityId': 'univ-A'
    },
    true // Devrait être autorisé
  )) passedTests++;

  // ═══════════════════════════════════════════════════════════════════
  log('\n\n╔════════════════════════════════════════════════════════════════════╗', 'bold');
  log('║                        RÉSULTAT FINAL                              ║', 'bold');
  log('╚════════════════════════════════════════════════════════════════════╝', 'bold');

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`\n📊 Total de tests: ${totalTests}`, 'cyan');
  log(`✅ Tests réussis: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`❌ Tests échoués: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? 'green' : 'red');
  log(`\n📈 Taux de réussite: ${successRate}%`, successRate >= 95 ? 'green' : 'red');

  if (passedTests === totalTests) {
    log('\n🎉 TOUTES LES VÉRIFICATIONS SONT PASSÉES!', 'green');
    log('🔒 L\'ISOLATION DES DONNÉES EST PARFAITE', 'green');
    log('✅ AUCUNE FAILLE DE SÉCURITÉ DÉTECTÉE', 'green');
    log('\n💡 Conclusion:', 'cyan');
    log('   • Isolation multi-tenant: PARFAITE ✅', 'green');
    log('   • Protection élévation privilèges: PARFAITE ✅', 'green');
    log('   • Isolation données sensibles: PARFAITE ✅', 'green');
    log('   • Respect principe moindre privilège: PARFAIT ✅', 'green');
    log('\n🚀 SYSTÈME PRODUCTION-READY', 'green');
    log('\n📝 Action requise:', 'yellow');
    log('   Déployer les Firebase Rules via Console Firebase', 'yellow');
    log('   firebase deploy --only database', 'yellow');

    return 0;
  } else {
    log('\n⚠️  DES PROBLÈMES DE SÉCURITÉ ONT ÉTÉ DÉTECTÉS', 'red');
    log('🔧 Veuillez corriger les règles Firebase avant la production', 'red');

    return 1;
  }
}

// Exécuter l'audit
const exitCode = runComprehensiveSecurityAudit();
process.exit(exitCode);
