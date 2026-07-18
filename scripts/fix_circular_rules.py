#!/usr/bin/env python3
"""
fix_circular_rules.py
Supprime les boucles circulaires dans Firebase Rules en simplifiant les règles .read et .write
"""

import json
import re
import sys

def simplify_rules(rules):
    """Simplifie récursivement les règles pour supprimer les boucles circulaires"""

    if isinstance(rules, dict):
        new_rules = {}
        for key, value in rules.items():
            # Si c'est une règle .read ou .write avec root.child('users')
            if key in ['.read', '.write'] and isinstance(value, str):
                # Si la règle contient root.child('users'), simplifier à "auth != null"
                if "root.child('users')" in value:
                    print(f"  ⚠️  Simplification de {key}: {value[:80]}...")
                    new_rules[key] = "auth != null"
                else:
                    new_rules[key] = value
            else:
                # Appel récursif pour les sous-objets
                new_rules[key] = simplify_rules(value)
        return new_rules

    elif isinstance(rules, list):
        return [simplify_rules(item) for item in rules]

    else:
        return rules

def main():
    input_file = '/Users/itopie/Desktop/university-saas/database.rules.json'
    output_file = '/Users/itopie/Desktop/university-saas/database.rules.json.fixed'

    print("🔍 Lecture de database.rules.json...")

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Erreur lecture fichier: {e}")
        sys.exit(1)

    print("🔧 Simplification des règles circulaires...\n")

    fixed_data = simplify_rules(data)

    print(f"\n💾 Écriture dans {output_file}...")

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(fixed_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"❌ Erreur écriture fichier: {e}")
        sys.exit(1)

    print("✅ Terminé !")
    print(f"\n📋 Vérifiez {output_file} puis remplacez database.rules.json")

if __name__ == '__main__':
    main()
