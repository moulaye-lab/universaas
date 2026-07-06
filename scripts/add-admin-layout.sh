#!/bin/bash

# Script pour ajouter AdminLayout à toutes les pages admin

PAGES=(
  "TeachersListPage"
  "TeacherDetailsPage"
  "StudentsListPage"
  "CreateStudentPage"
  "ParentsListPage"
  "ParentDetailsPage"
  "CreateParentPage"
  "CoursesListPage"
  "CreateCoursePage"
  "RoomsManagementPage"
  "ManageAcademicDataPage"
)

for page in "${PAGES[@]}"; do
  filepath="/Users/itopie/Desktop/university-saas/src/pages/admin/${page}.jsx"

  if [ -f "$filepath" ]; then
    echo "Processing $page..."

    # 1. Ajouter l'import AdminLayout après les autres imports
    if ! grep -q "import AdminLayout" "$filepath"; then
      # Trouver la dernière ligne d'import et ajouter après
      sed -i '' "/^import.*from/a\\
import AdminLayout from '../../components/AdminLayout';\\
" "$filepath"
    fi

    # 2. Remplacer <div className="min-h-screen par <AdminLayout>
    sed -i '' 's/<div className="min-h-screen[^>]*>/<AdminLayout>/g' "$filepath"

    # 3. Remplacer le dernier </div> avant }; par </AdminLayout>
    # Note: cette partie est délicate, on la fait manuellement

    echo "  ✓ Import ajouté"
  else
    echo "  ✗ Fichier non trouvé: $filepath"
  fi
done

echo ""
echo "✅ Script terminé - Vérifier manuellement les fermetures </AdminLayout>"
