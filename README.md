# tampermonkey-tool-exts

个人 Tampermonkey 油猴脚本集合，用于增强网页功能和提升浏览体验。

## 安装方法

1. 在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 点击下方脚本列表中的「安装」链接
3. 在 Tampermonkey 确认页面点击「安装」即可

## 脚本列表

| 脚本 | 功能描述 | 匹配网站 |
|------|----------|----------|
| [DeepSeek 项目上下文与多文件管理助手](docs/deepseek-project-context-helper.md) | 自动注入全局提示词；多文件项目管理与上下文注入；代码块一键复制 | `chat.deepseek.com` |
| [云学堂学习助手](docs/yunxuetang-learning-helper.md) | 自动播放课程、6 倍速播放、自动切换章节、防挂机检测 | `xuexi.yunxuetang.cn` |

## 快速开始

### DeepSeek 项目上下文与多文件管理助手

专为 DeepSeek 网页版设计的辅助工具，解决以下痛点：

- **全局提示词** - 每次问答自动带上你定义的上下文（类似 `/init`）
- **多文件管理** - 在浏览器内管理项目文件，提问时自动注入文件结构和代码
- **代码块复制** - 为 AI 回复的代码块添加一键复制按钮

[查看详细文档 →](docs/deepseek-project-context-helper.md)

### 云学堂学习助手

云学堂自动学习辅助工具：

- **自动播放** - 自动点击「开始学习」、「继续学习」按钮
- **6 倍速播放** - 视频、PPT、PDF 等课程类型自动加速
- **自动切换章节** - 当前章节完成后自动进入下一章节
- **防挂机检测** - 定时重置挂机时间

[查看详细文档 →](docs/yunxuetang-learning-helper.md)

## 添加新脚本

本仓库鼓励通过 Pull Request 贡献新脚本。每个脚本需满足：

- 文件名以 `.user.js` 结尾
- 包含完整的 Tampermonkey 元数据块（`@name`、`@description`、`@match`、`@version`、`@author`）
- 代码结构清晰，关键逻辑添加注释说明

## 仓库结构

```
├── README.md              # 项目总览
├── LICENSE                # 开源许可证
├── scripts/               # 所有用户脚本
│   ├── deepseek-project-context-helper.user.js
│   ├── yunxuetang-learning-helper.user.js
│   └── template.user.js   # 新脚本模板
├── docs/                  # 脚本详细文档
│   ├── deepseek-project-context-helper.md
│   └── yunxuetang-learning-helper.md
└── assets/                # 资源文件
    └── screenshots/       # 脚本效果截图
```

## 许可证

本项目采用 [MIT License](LICENSE) 开源。
