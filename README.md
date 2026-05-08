# tampermonkey-tool-exts

个人 Tampermonkey 油猴脚本集合，用于增强网页功能和提升浏览体验。

## 安装方法

1. 在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 点击下方脚本列表中的「安装」链接
3. 在 Tampermonkey 确认页面点击「安装」即可

## 脚本列表

| 脚本 | 功能描述 | 匹配网站 |
|------|----------|----------|
| [DeepSeek 助手增强面板](docs/deepseek-enhanced-panel.md) | 常用命令管理、代码块列表与快速定位、阅读进度条、数据导入导出 | `chat.deepseek.com` |
| [通义千问助手增强面板](docs/qianwen-enhanced-panel.md) | 常用命令管理、代码块列表与快速定位、阅读进度条、数据导入导出 | `qianwen.com` |
| [云学堂学习助手](docs/yunxuetang-learning-helper.md) | 自动播放课程、6 倍速播放、自动切换章节、防挂机检测 | `xuexi.yunxuetang.cn` |

## 快速开始

### DeepSeek 助手增强面板 (`scripts/deepseek-enhanced-panel.user.js`)

DeepSeek 聊天页面的悬浮增强控制面板：

- **常用命令管理** - 添加、编辑、删除自定义命令，点击即可自动填入输入框
- **代码块列表** - 自动扫描页面中所有代码块，点击可快速定位并高亮
- **阅读进度条** - 页面顶部渐变色进度条，实时反映滚动阅读进度
- **数据导入导出** - 支持命令数据导出为 JSON 文件备份，也可导入恢复
- **悬浮面板** - 可拖拽移动，支持最小化/关闭

[查看详细文档 →](docs/deepseek-enhanced-panel.md)

### 通义千问助手增强面板 (`scripts/qianwen-enhanced-panel.user.js`)

通义千问聊天页面的悬浮增强控制面板（功能与 DeepSeek 版本一致，适配通义千问页面）：

- **常用命令管理** - 添加、编辑、删除自定义命令，点击即可自动填入输入框
- **代码块列表** - 自动扫描页面中所有代码块，点击可快速定位并高亮
- **阅读进度条** - 页面顶部橙红色渐变进度条，实时反映滚动阅读进度
- **数据导入导出** - 支持命令数据导出为 JSON 文件备份，也可导入恢复
- **悬浮面板** - 可拖拽移动，支持最小化/关闭

[查看详细文档 →](docs/qianwen-enhanced-panel.md)

### 云学堂学习助手 (`scripts/yunxuetang-learning-helper.user.js`)

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
│   ├── deepseek-enhanced-panel.user.js
│   ├── qianwen-enhanced-panel.user.js
│   ├── yunxuetang-learning-helper.user.js
│   └── template.user.js   # 新脚本模板
├── docs/                  # 脚本详细文档
│   ├── deepseek-enhanced-panel.md
│   ├── qianwen-enhanced-panel.md
│   └── yunxuetang-learning-helper.md
└── assets/                # 资源文件
    └── screenshots/       # 脚本效果截图
```

## 许可证

本项目采用 [MIT License](LICENSE) 开源。
