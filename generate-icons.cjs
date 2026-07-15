/**
 * Script de génération d'icônes PWA
 * Usage: node generate-icons.js
 *
 * Prérequis: npm install sharp
 * Génère toutes les tailles d'icônes à partir d'une SVG source
 */

const fs = require('fs');
const path = require('path');

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Tailles d'icônes PWA requises
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG de base (logo simple University SaaS)
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fond arrondi -->
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>

  <!-- Icône université (chapeau diplômé stylisé) -->
  <g transform="translate(256, 256)">
    <!-- Base du chapeau -->
    <path d="M -140,-40 L 140,-40 L 120,-20 L -120,-20 Z" fill="white" opacity="0.95"/>

    <!-- Dessus du chapeau -->
    <ellipse cx="0" cy="-60" rx="160" ry="30" fill="white"/>
    <ellipse cx="0" cy="-60" rx="140" ry="25" fill="#FCD34D"/>

    <!-- Livre ouvert en dessous -->
    <path d="M -80,0 L -80,80 Q -40,70 0,80 Q 40,70 80,80 L 80,0 Z" fill="white" opacity="0.9"/>
    <line x1="0" y1="0" x2="0" y2="80" stroke="#4F46E5" stroke-width="3"/>

    <!-- Pompon -->
    <circle cx="100" cy="-80" r="12" fill="#FCD34D"/>
    <line x1="70" y1="-65" x2="100" y2="-80" stroke="white" stroke-width="3"/>
  </g>

  <!-- Texte -->
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">
    UniSaaS
  </text>
</svg>
`.trim();

// Fonction pour convertir SVG en PNG avec Sharp (si disponible)
async function generatePNGWithSharp(size) {
  try {
    const sharp = require('sharp');
    const svgBuffer = Buffer.from(svgContent);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

    console.log(`✅ Généré: icon-${size}x${size}.png`);
  } catch (error) {
    console.error(`❌ Erreur Sharp pour ${size}x${size}:`, error.message);
    return false;
  }
  return true;
}

// Fonction fallback: Sauvegarder les SVG
function saveSVGFallback(size) {
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(
    path.join(iconsDir, filename),
    svgContent.replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`)
  );
  console.log(`📝 SVG fallback: ${filename}`);
}

// Main
(async () => {
  console.log('🎨 Génération des icônes PWA...\n');

  let sharpAvailable = true;
  try {
    require('sharp');
  } catch {
    console.log('⚠️  Sharp non installé. Génération de SVG fallback.');
    console.log('   Pour des PNG: npm install sharp\n');
    sharpAvailable = false;
  }

  for (const size of sizes) {
    if (sharpAvailable) {
      const success = await generatePNGWithSharp(size);
      if (!success) {
        saveSVGFallback(size);
      }
    } else {
      saveSVGFallback(size);
    }
  }

  console.log('\n✨ Génération terminée!');
  console.log(`📁 Icônes dans: ${iconsDir}`);

  if (!sharpAvailable) {
    console.log('\n💡 Astuce: Installer Sharp pour des PNG optimisés:');
    console.log('   npm install sharp');
  }
})();
