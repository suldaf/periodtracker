#!/bin/bash

source ./bin/modules/paths.sh

# Declare an array with the paths
declare -a paths=($k8s_path $resources_path $common_path $delete_account_path $flower_path $ular_tangga_path $quiz_path)

# Loop over the paths, and remove all the files and reset git index
for path in "${paths[@]}"; do
    if [ -n "$path" ]; then
        echo "Removing $path from index and filesystem..."
        # Deinit submodule if it's there
        git submodule deinit -f "$path" 2>/dev/null
        # Remove from git index
        git rm -rf --cached "$path" 2>/dev/null
        # Remove the directory
        rm -rf "$path"
        # Also remove the git cache for submodules
        rm -rf .git/modules/"$path" 2>/dev/null
    fi
done

# Clear and stage .gitmodules
rm -rf .gitmodules
touch .gitmodules
git add .gitmodules




