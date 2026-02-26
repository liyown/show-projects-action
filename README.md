# Show Projects Action

[![CI](https://github.com/liyown/show-projects-action/actions/workflows/ci.yml/badge.svg)](https://github.com/liyown/show-projects-action/actions)
[![Coverage](./badges/coverage.svg)](#)

一个 GitHub Action，用于在 README 中展示组织或用户的项目列表。

## 特性

- 自动获取 GitHub 组织或用户的所有仓库
- 按创建时间排序
- 生成可点击的项目链接
- 显示项目描述
- 支持排除特定仓库
- 支持自定义标记和 README 路径

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
ACTIONS_STEP_DEBUG=true
GITHUB_WORKSPACE=/path/to/your/workspace
EOF

# 运行
npm run local-action
```

### 构建

```bash
npm run package
```

## License

MIT
