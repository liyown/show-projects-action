# Show Projects Action

[![CI](https://github.com/liyown/show-projects-action/actions/workflows/ci.yml/badge.svg)](https://github.com/liyown/show-projects-action/actions)
[![Coverage](./badges/coverage.svg)](#)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/liyown/show-projects-action?sort=semver)](https://github.com/liyown/show-projects-action/releases/latest)
[![License](https://img.shields.io/github/license/liyown/show-projects-action)](LICENSE)

一个 GitHub Action，用于在 README 中展示组织或用户的项目列表。

## 目录

- [特性](#特性)
- [快速开始](#快速开始)
- [使用方法](#使用方法)
  - [在 README 中添加标记](#1-在-readme-中添加标记)
  - [创建 Workflow](#2-创建-workflow)
  - [输出效果](#3-输出效果)
- [参数说明](#参数说明)
- [示例](#示例)
  - [完整配置](#完整配置)
  - [排除特定仓库](#排除特定仓库)
  - [使用自定义标记](#使用自定义标记)
  - [多页面配置](#多页面配置)
  - [自动更新所有仓库的 README](#自动更新所有仓库的-readme)
- [高级用法](#高级用法)
  - [触发方式](#触发方式)
  - [权限说明](#权限说明)
- [开发](#开发)
  - [本地测试](#本地测试)
  - [构建](#构建)
- [License](#license)

## 特性

- 自动获取 GitHub 组织或用户的所有仓库
- 按创建时间排序（从早到晚）
- 生成可点击的项目链接
- 显示项目描述
- 支持排除特定仓库
- 支持自定义标记和 README 路径
- 支持分页获取（自动获取所有仓库）
- 开箱即用，无需额外配置

## 快速开始

1 分钟快速集成：

```yaml
# .github/workflows/update-projects.yml
name: Update Projects

on:
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: liyown/show-projects-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          owner: your-username
```

在 `README.md` 中添加 `<!--PROJECTS-->` 即可。

## 使用方法

### 1. 在 README 中添加标记

在 `README.md` 中添加 `<!--PROJECTS-->` 标记：

```markdown
# My Projects

<!--PROJECTS-->

## More info...
```

### 2. 创建 Workflow

在 `.github/workflows/update-projects.yml` 中：

```yaml
name: Update Projects

on:
  schedule:
    - cron: '0 0 * * *'  # 每天运行一次
  workflow_dispatch:  # 允许手动触发

jobs:
  update-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update README with projects
        uses: liyown/show-projects-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          owner: your-org-or-username
```

### 3. 输出效果

生成的格式如下（按创建时间排序）：

```markdown
<!--PROJECTS-->
- [project-name](https://github.com/owner/project-name) - 项目描述
- [another-project](https://github.com/owner/another-project)
<!--PROJECTS-->
```

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `token` | 是 | - | GitHub Token，通常用 `${{ secrets.GITHUB_TOKEN }}` |
| `owner` | 是 | - | 组织名或用户名 |
| `readme-path` | 否 | `README.md` | README 文件路径 |
| `marker` | 否 | `<!--PROJECTS-->` | 标记 Comment |
| `exclude` | 否 | - | 排除的仓库，用逗号分隔 |

## 示例

### 完整配置

```yaml
- name: Update README
  uses: liyown/show-projects-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    owner: liyown
    readme-path: 'README.md'
    marker: '<!--PROJECTS-->'
    exclude: 'repo1,repo2,repo3'
```

### 排除特定仓库

```yaml
- name: Update README
  uses: liyown/show-projects-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    owner: liyown
    exclude: 'show-projects-action,archived-repo'
```

### 使用自定义标记

在 README 中：
```markdown
# My Projects

<!--MY_PROJECTS_START-->
<!--MY_PROJECTS_END-->
```

在 Workflow 中：
```yaml
- uses: liyown/show-projects-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    owner: liyown
    marker: '<!--MY_PROJECTS_START-->'
```

### 多页面配置

如果你有多个 README 需要展示不同项目：

```yaml
# .github/workflows/update-projects.yml
name: Update Projects

on:
  workflow_dispatch:

jobs:
  update-main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: liyown/show-projects-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          owner: liyown
          readme-path: 'README.md'
          marker: '<!--PROJECTS-->'

  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: liyown/show-projects-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          owner: liyown
          readme-path: 'docs/PROJECTS.md'
          marker: '<!--PROJECTS-->'
          exclude: 'docs,website'
```

### 自动更新所有仓库的 README

这个示例展示如何自动更新所有你拥有的仓库的 README：

```yaml
name: Update All Repos

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  update-all:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get all repos
        uses: octokit/request-action@v5
        id: repos
        with:
          route: GET /user/repos?per_page=100&sort=created
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Update each repo README
        uses: liyown/show-projects-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          owner: ${{ github.repository_owner }}
          marker: '<!--PROJECTS-->'
        # 注意：这个示例需要额外的逻辑来更新其他仓库
```

## 高级用法

### 触发方式

```yaml
on:
  # 每天凌晨执行
  schedule:
    - cron: '0 0 * * *'

  # 每次推送时执行
  push:
    branches:
      - main

  # 手动触发
  workflow_dispatch:

  # 每天 6 点和 18 点执行
  schedule:
    - cron: '0 6,18 * * *'
```

### 权限说明

确保 workflow 有足够的权限：

```yaml
permissions:
  contents: write  # 需要写入内容来更新 README
```

完整配置：

```yaml
name: Update Projects

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: liyown/show-projects-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          owner: ${{ github.repository_owner }}
```

## 开发

### 本地测试

```bash
# 安装依赖
npm install

# 创建 .env 文件
cat > .env << EOF
INPUT_TOKEN=your_github_token
INPUT_OWNER=your-username
INPUT_MARKER=<!--PROJECTS-->
INPUT_README_PATH=README.md
ACTIONS_STEP_DEBUG=true
GITHUB_WORKSPACE=/path/to/your/workspace
EOF

# 在 README 中添加测试标记
# 然后运行
npm run local-action
```

### 构建

```bash
# 安装依赖
npm install

# 构建
npm run package

# 格式化 + lint + 测试 + 构建
npm run all
```

### 发布新版本

```bash
# 更新版本号
# 修改 package.json 中的 version

# 构建
npm run package

# 提交
git add .
git commit -m "release: v0.0.2"

# 打标签
git tag v0.0.2
git tag v0  # 更新主版本标签

# 推送
git push && git push --tags
```

## License

MIT
