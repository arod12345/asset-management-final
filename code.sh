#!/bin/bash
# Use the first argument as the target folder; default to the current directory if none is provided.
folder="${1:-.}"
output="merged_code.txt"

# Clear the output file (or create it if it doesn't exist)
> "$output"

# Find all .ts, .tsx, and .json files (recursively)
# Exclude files in any directory path containing "node_modules", "xgenia-git", or "test" (case-insensitive)
# Also exclude package.json, package-lock.json, and README.md to avoid merging unwanted files.
find "$folder" -type f \( -iname "*.ts" -o -iname "*.js" -o -iname "*.jsx" -o -iname "*.env" -o -iname "*.css" -o -iname "*.tsx" -o -iname "*.json" -o -iname "*.html" \) \
  ! -ipath "*/node_modules/*" \
  ! -ipath "*/package-lock.json" \
  ! -ipath "*/.next/*" \
  ! -ipath "*/.clerk/*" \
  ! -ipath "*/.vscode/*" \
  ! -iname "README.md" \
  -print | while IFS= read -r file; do
    # Get the absolute path of the file's parent folder
    folderpath=$(dirname "$(realpath "$file")")
    # Write folder header with full absolute path
    echo "=== Folder: $folderpath ===" >> "$output"
    # Write file header (just the file's name)
    echo "--- File: $(basename "$file") ---" >> "$output"
    # Append file content
    cat "$file" >> "$output"
    # Add an extra newline for readability
    echo -e "\n" >> "$output"
done

echo "Merging complete. Check the file: $output"
