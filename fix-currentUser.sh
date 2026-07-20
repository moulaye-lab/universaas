#!/bin/bash
# Fix currentUser.uid undefined in all creation pages

FILES=(
  "src/pages/admin/CreateStudentPage.jsx"
  "src/pages/admin/CreateTeacherPage.jsx"
  "src/pages/admin/CreateComptablePage.jsx"
  "src/pages/admin/CreateParentPage.jsx"
  "src/pages/admin/FreePaymentPage.jsx"
  "src/pages/admin/RoomsManagementPage.jsx"
  "src/pages/admin/LibraryResourcesPage.jsx"
  "src/pages/admin/TuitionFeesManagementPage.jsx"
  "src/pages/admin/ManageAcademicDataPage.jsx"
  "src/pages/admin/ImportDataPage.jsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Checking $file..."

    # Check if file already has validation
    if grep -q "if (!currentUser?.uid)" "$file"; then
      echo "  ✅ Already has validation"
    else
      # Check if file uses currentUser
      if grep -q "currentUser\.uid\|currentUser\?.uid" "$file"; then
        echo "  ⚠️  Uses currentUser.uid but missing validation"

        # Find the submit handler line number
        LINE=$(grep -n "const handle.*Submit.*= async" "$file" | head -1 | cut -d: -f1)
        if [ ! -z "$LINE" ]; then
          echo "  📝 Submit handler at line $LINE"
        fi
      else
        echo "  ℹ️  Does not use currentUser.uid"
      fi
    fi
  fi
done
