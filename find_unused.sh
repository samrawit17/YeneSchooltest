#!/bin/bash
components=$(find frontend/src/components -type f \( -name "*.tsx" -o -name "*.ts" \) | grep -v "ui/" | grep -v "index.ts")
for comp in $components; do
    filename=$(basename "$comp" | sed 's/\.tsx//' | sed 's/\.ts//')
    count=$(grep -r "from .*/$filename" frontend/src | grep -v "$comp" | wc -l)
    if [ "$count" -eq 0 ]; then
        # Check for direct imports without 'from' (rare but possible)
        count2=$(grep -r "import .*$filename" frontend/src | grep -v "$comp" | wc -l)
        if [ "$count2" -eq 0 ]; then
            echo "Unused component: $comp"
        fi
    fi
done
