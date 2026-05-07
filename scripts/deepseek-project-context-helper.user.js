// ==UserScript==
// @name         DeepSeek 项目上下文与多文件管理助手
// @namespace    https://github.com/your-username/tampermonkey-tool-exts
// @version      1.0
// @description  解决DeepSeek网页版痛点：1. 自动注入全局提示词(类似/init)；2. 多文件项目管理与上下文注入。
// @author       YourName
// @match        https://chat.deepseek.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ================== 1. 初始化样式与数据结构 ==================
    GM_addStyle(`
        #ds-helper-container { position: fixed; top: 20px; left: 20px; z-index: 9999; display: flex; gap: 10px; font-family: sans-serif; }
        .ds-panel { background: #1e1e1e; color: #fff; border: 1px solid #444; border-radius: 8px; padding: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; flex-direction: column; }
        #ds-prompt-panel { width: 250px; height: 300px; }
        #ds-files-panel { width: 300px; height: 400px; }
        .ds-panel h3 { margin: 0 0 10px 0; font-size: 14px; color: #4CAF50; border-bottom: 1px solid #444; padding-bottom: 5px; }
        textarea { flex: 1; background: #2d2d2d; border: 1px solid #555; color: #ddd; padding: 8px; border-radius: 4px; resize: none; font-size: 12px; }
        textarea:focus { outline: 1px solid #4CAF50; }
        .ds-file-controls { display: flex; gap: 5px; margin-bottom: 8px; }
        .ds-file-controls input { flex: 1; background: #2d2d2d; border: 1px solid #555; color: #fff; padding: 4px; border-radius: 4px; }
        .ds-btn { background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .ds-btn:hover { background: #45a049; }
        .ds-btn.danger { background: #d32f2f; }
        .ds-btn.danger:hover { background: #b71c1c; }
        #ds-file-list { flex: 1; overflow-y: auto; margin-bottom: 8px; border: 1px solid #444; border-radius: 4px; }
        .ds-file-item { padding: 6px; cursor: pointer; border-bottom: 1px solid #333; font-size: 12px; display: flex; justify-content: space-between; }
        .ds-file-item:hover { background: #333; }
        .ds-file-item.active { background: #2c4a34; border-left: 3px solid #4CAF50; }
        #ds-file-editor { height: 120px; margin-top: 5px; }
        /* 为AI回复的代码块添加复制按钮样式 */
        .ds-copy-btn { position: absolute; top: 5px; right: 5px; background: #4CAF50; color: white; border: none; padding: 2px 8px; font-size: 10px; border-radius: 3px; cursor: pointer; opacity: 0.7; }
        .ds-copy-btn:hover { opacity: 1; }
        pre { position: relative; }
    `);

    // 默认数据
    const DEFAULT_PROMPT = "你是一个资深全栈工程师。请始终遵循最佳实践，代码需简洁、健壮。";
    const DEFAULT_FILES = { 'main.js': '// 在这里编写你的代码...' };

    // 读取本地存储
    let globalPrompt = GM_getValue('ds_global_prompt', DEFAULT_PROMPT);
    let projectFiles = GM_getValue('ds_project_files', DEFAULT_FILES);
    let currentFileName = Object.keys(projectFiles);

    // ================== 2. 渲染 UI 界面 ==================
    function renderUI() {
        const container = document.createElement('div');
        container.id = 'ds-helper-container';
        container.innerHTML = `
            <!-- 痛点1：全局提示词面板 -->
            <div class="ds-panel" id="ds-prompt-panel">
                <h3>💡 全局上下文 (自动注入)</h3>
                <textarea id="ds-prompt-input" placeholder="输入每次问答都要带上的上下文...">${globalPrompt}</textarea>
            </div>

            <!-- 痛点2：多文件管理面板 -->
            <div class="ds-panel" id="ds-files-panel">
                <h3>📂 多文件项目管理</h3>
                <div class="ds-file-controls">
                    <input type="text" id="ds-new-filename" placeholder="文件名 (如 popup.html)">
                    <button class="ds-btn" id="ds-add-file">新建</button>
                </div>
                <div id="ds-file-list"></div>
                <textarea id="ds-file-editor" placeholder="选中文件后在此编辑代码..."></textarea>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                    <button class="ds-btn danger" id="ds-delete-file">删除当前文件</button>
                    <span style="font-size:10px; color:#888; align-self:center;">*修改会自动保存</span>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        bindEvents();
        renderFileList();
        updateEditor();
    }

    // ================== 3. 事件绑定与逻辑处理 ==================
    function bindEvents() {
        // 保存全局提示词
        document.getElementById('ds-prompt-input').addEventListener('input', (e) => {
            globalPrompt = e.target.value;
            GM_setValue('ds_global_prompt', globalPrompt);
        });

        // 新建文件
        document.getElementById('ds-add-file').addEventListener('click', () => {
            const input = document.getElementById('ds-new-filename');
            const name = input.value.trim();
            if (name && !projectFiles[name]) {
                projectFiles[name] = '';
                currentFileName = name;
                saveFiles();
                renderFileList();
                updateEditor();
                input.value = '';
            } else if (projectFiles[name]) {
                alert('该文件已存在！');
            }
        });

        // 删除文件
        document.getElementById('ds-delete-file').addEventListener('click', () => {
            if (Object.keys(projectFiles).length <= 1) {
                alert('至少保留一个文件！');
                return;
            }
            if (confirm(`确定删除 ${currentFileName} 吗？`)) {
                delete projectFiles[currentFileName];
                currentFileName = Object.keys(projectFiles);
                saveFiles();
                renderFileList();
                updateEditor();
            }
        });

        // 编辑文件内容
        document.getElementById('ds-file-editor').addEventListener('input', (e) => {
            projectFiles[currentFileName] = e.target.value;
            saveFiles();
        });

        // 拦截 DeepSeek 发送按钮，注入上下文
        // 使用事件捕获来在 DeepSeek 自身逻辑之前修改输入框
        document.body.addEventListener('click', (e) => {
            // 寻找发送按钮 (根据 DeepSeek 网页版实际结构，通常是 button[type="submit"] 或带有特定 aria-label 的按钮)
            const submitBtn = e.target.closest('button[type="submit"]') || e.target.closest('div[role="button"]');
            if (submitBtn) {
                injectContext();
            }
        }, true);
    }

    // ================== 4. 核心功能：注入上下文 ==================
    function injectContext() {
        const textarea = document.querySelector('form textarea');
        if (!textarea) return;

        let userText = textarea.value.trim();
        if (!userText) return;

        // 1. 注入全局提示词
        let finalText = `【系统上下文】\n${globalPrompt}\n\n`;

        // 2. 注入多文件代码
        let filesContext = "【当前项目文件结构】\n";
        for (const [name, code] of Object.entries(projectFiles)) {
            filesContext += `\n### 文件: ${name} ###\n${code}\n`;
        }
        filesContext += "\n请基于以上项目结构和上下文，回答我的问题：\n\n";

        // 如果用户还没输入问题，或者问题很短，我们把文件上下文放在前面
        // 拼接逻辑：系统提示词 + 文件上下文 + 用户实际提问
        textarea.value = finalText + filesContext + userText;

        // 触发 input 事件，让 DeepSeek 网页版感知到输入框内容变化
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ================== 5. 辅助函数 ==================
    function saveFiles() {
        GM_setValue('ds_project_files', projectFiles);
    }

    function renderFileList() {
        const list = document.getElementById('ds-file-list');
        list.innerHTML = '';
        Object.keys(projectFiles).forEach(name => {
            const div = document.createElement('div');
            div.className = `ds-file-item ${name === currentFileName ? 'active' : ''}`;
            div.textContent = name;
            div.onclick = () => {
                currentFileName = name;
                renderFileList();
                updateEditor();
            };
            list.appendChild(div);
        });
    }

    function updateEditor() {
        document.getElementById('ds-file-editor').value = projectFiles[currentFileName] || '';
    }

    // ================== 6. 增强体验：代码块一键复制 ==================
    function enableCodeCopy() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.tagName === 'PRE') {
                        if (!node.querySelector('.ds-copy-btn')) {
                            const btn = document.createElement('button');
                            btn.className = 'ds-copy-btn';
                            btn.textContent = '复制';
                            btn.onclick = () => {
                                const code = node.querySelector('code')?.innerText || node.innerText;
                                navigator.clipboard.writeText(code).then(() => {
                                    btn.textContent = '已复制!';
                                    setTimeout(() => btn.textContent = '复制', 2000);
                                });
                            };
                            node.appendChild(btn);
                        }
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ================== 启动 ==================
    // 等待页面加载完成
    if (document.readyState === 'complete') {
        renderUI();
        enableCodeCopy();
    } else {
        window.addEventListener('load', () => {
            renderUI();
            enableCodeCopy();
        });
    }
})();
