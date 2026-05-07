# Game Submodule Setup (Ular Tangga)

The Ular Tangga game is implemented as an **optional submodule**. It can be included or excluded from the build without modifying any core app code.

## Architecture

```
app/src/screens/UlarTangga/
├── index.tsx              ← wrapper (checks for submodule, shows fallback if missing)
└── optional/              ← git submodule (separate repo on GitLab)
    ├── index.tsx          ← game entry point
    ├── components/
    ├── hooks/
    ├── parts/
    ├── utils/
    ├── assets/
    ├── UlarTangga.types.ts
    ├── UlarTangga.constants.ts
    └── ...
```

The top-level `index.tsx` does a `require('./optional/index')` inside a `try/catch`. If the submodule is not present, the app continues to run and shows a fallback screen instead.

---

## Setup for New Developers

### 1. Clone the main repo

```bash
git clone <main-repo-url>
cd periodtracker
```

### 2. Verify the submodule URL

Open [bin/modules/urls.sh](../bin/modules/urls.sh) and make sure this line is not commented out:

```bash
ular_tangga_url="https://gitlab.com/digitala-oky/periodtracker_ular-tangga-indonesia.git"
```

To use a different game repo (e.g. your own fork), replace the URL here.

### 3. Pull all submodules

```bash
yarn modules
```

This command:
1. Removes existing submodules (`bin/modules/remove.sh`)
2. Runs `git submodule add` for each URL defined in `urls.sh`
3. Runs `git submodule update --remote` to pull the latest commits

After it completes, the `app/src/screens/UlarTangga/optional/` folder will be populated.

### 4. Install dependencies and run the app

```bash
cd app
yarn
cd ..
yarn start
```

---

## Using Your Own Game Repo

Follow these steps if your team wants to fork or create your own version of the Ular Tangga game.

### a. Create a new repository on GitLab/GitHub

Recommended naming: `periodtracker_ular-tangga-[label]`
Example: `periodtracker_ular-tangga-fr`

### b. Initialize from the existing submodule

```bash
# Navigate to the submodule folder
cd app/src/screens/UlarTangga/optional

# Remove the old git history
rm -rf .git

# Initialize a new repo
git init
git add .
git commit -m "Initial commit"
git remote add origin <YOUR_REPO_URL>
git push -u origin master
```

### c. Update the URL in urls.sh

Open [bin/modules/urls.sh](../bin/modules/urls.sh) and replace:

```bash
ular_tangga_url="<YOUR_REPO_URL>"
```

### d. Re-pull the submodule

Return to the project root, then:

```bash
cd ../../../../
yarn modules
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `optional/` folder is empty after `yarn modules` | Check that `ular_tangga_url` in `urls.sh` is not commented out |
| `Repository not found` error | Make sure your SSH key or GitLab token is configured |
| Game does not appear in the app, no error shown | Check `console.warn` in the Metro output — the import likely failed silently |
| Local changes in `optional/` were lost after `yarn modules` | Push your changes before running `yarn modules` |
| Want to test without the submodule | Comment out `ular_tangga_url` — the app will use the fallback screen |
