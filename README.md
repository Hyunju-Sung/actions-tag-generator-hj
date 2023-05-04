# actions-tag-generator

### 1. Desctiption
This Action is a tag generator for creating Yogiyo's Semver.

### 2. Inputs

| Name          | Description                                                             | Default Value |
|---------------|-------------------------------------------------------------------------|---------------|
| env           | Environment `prd`, `stg`.                                               | -             |
| github-token  | Github Personal Access token. This must be a secret.                    | -             |
| version-type  | The type of version tag. `app`, `helm`                                  | -             |
| increment     | (Optional) Increment value type for prod tag. `major`, `minor`, `patch` | `patch`       |

### 3. Outputs
| Name                  | Type    | Description                                               |
|-----------------------|---------|-----------------------------------------------------------|
| new-prd-tag           | String  | New tag of prod env                                       |
| new-stg-tag           | String  | New tag of stage env                                      |
| latest-prd-tag        | String  | Latest tag of prod env                                    |
| latest-stg-tag        | String  | Latest tag of stage env                                   |

### 4. Secrets
| Name            | Description                         | Default Value |
|-----------------|-------------------------------------|---------------|
| PAT_FOR_ACTIONS | Github Personal Access token.       | -             |

### 5. Environment Variables
N/A

### 6. How to use
- Install Nodejs with [setup-node][setup_node]
- Generate Tag
```
name: Generate Tag

on:
  push:
    branches:
      - stage

jobs:
  add-stg-tag:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Generate Tag
        id: generate_tag
        uses: yogiyo/actions-tag-generator@0
        with:
          github-token: ${{ secrets.PAT_FOR_ACTIONS }}
          env: 'stg'

      - name: Create and push tags
        env:
          GITHUB_TOKEN: ${{ secrets.PAT_FOR_ACTIONS }}
        run: |
          # Access the outputs using the 'steps' context
          echo "New prd tag: ${{ steps.generate_tag.outputs.new-prd-tag }}"
          echo "New stg tag: ${{ steps.generate_tag.outputs.new-stg-tag }}"
          echo "Latest prd tag: ${{ steps.generate_tag.outputs.latest-prd-tag }}"
          echo "Latest stg tag: ${{ steps.generate_tag.outputs.latest-stg-tag }}"
```
[setup_node]: https://github.com/marketplace/actions/setup-node-js-environment