// ==UserScript==
// @name         DeepSeek 助手增强面板
// @namespace    https://chat.deepseek.com/
// @version      1.6.0
// @description  常用命令管理、代码块列表、进度条（终极修复输入填充）
// @author       Assistant
// @match        https://chat.deepseek.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEYS = {
        COMMANDS: 'ds_assistant_commands',
        PANEL_POS: 'ds_assistant_panel_pos'
    };

    let commands = [];
    let refreshTimer = null;
    let isScrolling = false;

    function generateUID() {
        return 'ds_uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    }

    // ======================== 最强输入框填充 ========================
    // 等待输入框出现（动态加载）
    function waitForInputElement(timeout = 5000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                const input = getInputElementDirect();
                if (input) {
                    resolve(input);
                    return;
                }
                if (Date.now() - start > timeout) {
                    resolve(null);
                    return;
                }
                setTimeout(check, 200);
            };
            check();
        });
    }

    // 直接获取输入框（不等待）
    function getInputElementDirect() {
        // 针对 DeepSeek 新版聊天输入框的精确选择器（2025年4月）
        const selectors = [
            'div[contenteditable="true"][role="textbox"]',   // 常见的富文本输入框
            'div[contenteditable="true"].ds-input',          // 自定义类
            '.chat-input-area div[contenteditable="true"]',
            '.message-input-area div[contenteditable="true"]',
            'textarea.ds-input-textarea',
            '#chat-input textarea',
            '[data-testid="chat-input"]',
            'textarea[placeholder*="消息"]',
            'textarea'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
                console.log('[DeepSeek助手] 使用选择器找到输入框:', sel, el);
                return el;
            }
        }
        // 遍历所有 contenteditable
        const allEditable = document.querySelectorAll('[contenteditable="true"]');
        for (const ed of allEditable) {
            if (ed.offsetParent !== null && (ed.innerText !== undefined || ed.textContent !== undefined)) {
                console.log('[DeepSeek助手] 通过遍历contenteditable找到输入框:', ed);
                return ed;
            }
        }
        console.warn('[DeepSeek助手] 未找到任何输入框');
        return null;
    }

    // 模拟用户真实输入（触发所有必要事件）
    async function simulateUserInput(element, text) {
        if (!element) return false;
        
        // 先聚焦
        element.focus();
        element.click();
        
        // 清空原有内容
        if (element.isContentEditable) {
            element.innerText = '';
        } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = '';
        }
        
        // 方法一：使用 execCommand（最接近真实输入）
        try {
            // 确保可编辑区域获得焦点
            element.focus();
            // 清空并选择
            if (element.isContentEditable) {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(element);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                element.select();
            }
            // 插入文本
            const success = document.execCommand('insertText', false, text);
            if (success) {
                console.log('[DeepSeek助手] execCommand 插入成功');
                // 额外触发 input 事件
                element.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            } else {
                throw new Error('execCommand 返回 false');
            }
        } catch (err) {
            console.warn('[DeepSeek助手] execCommand 失败，尝试降级方案', err);
            // 降级方案：直接修改 value/innerText + 事件模拟
            if (element.isContentEditable) {
                element.innerText = text;
            } else {
                element.value = text;
            }
            // 触发各种事件
            const events = ['input', 'change', 'keydown', 'keypress', 'keyup'];
            for (const evType of events) {
                const event = new Event(evType, { bubbles: true });
                element.dispatchEvent(event);
            }
            // 额外触发 CompositionEvent
            const compositionStart = new CompositionEvent('compositionstart', { bubbles: true });
            const compositionEnd = new CompositionEvent('compositionend', { bubbles: true, data: text });
            element.dispatchEvent(compositionStart);
            element.dispatchEvent(compositionEnd);
            return true;
        }
    }

    async function insertToInput(text) {
        console.log('[DeepSeek助手] 尝试插入文本:', text.substring(0, 50));
        const input = await waitForInputElement(3000);
        if (!input) {
            alert('无法找到输入框，请刷新页面后重试。\n如果问题持续，请按F12反馈控制台错误。');
            console.error('[DeepSeek助手] 输入框不存在，DOM结构:', document.body.innerHTML.substring(0, 1000));
            return false;
        }
        console.log('[DeepSeek助手] 找到输入框元素:', input);
        const success = await simulateUserInput(input, text);
        if (success) {
            console.log('[DeepSeek助手] 文本已填入输入框');
            // 可选：自动聚焦并闪烁提示
            input.style.transition = 'box-shadow 0.2s';
            input.style.boxShadow = '0 0 0 2px #3b82f6';
            setTimeout(() => { input.style.boxShadow = ''; }, 800);
        } else {
            alert('填充失败，您可以手动输入或复制命令。');
        }
        return success;
    }

    // ======================== 进度条 ========================
    let progressBar = null;
    function createProgressBar() {
        if (progressBar) return;
        progressBar = document.createElement('div');
        progressBar.id = 'ds-reading-progress';
        progressBar.innerHTML = '<div class="ds-progress-fill"></div>';
        document.body.appendChild(progressBar);
        const update = () => {
            const winScroll = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = (winScroll / height) * 100;
            const fill = progressBar.querySelector('.ds-progress-fill');
            if (fill) fill.style.width = scrolled + '%';
        };
        window.addEventListener('scroll', update);
        window.addEventListener('resize', update);
        update();
    }

    // ======================== 悬浮面板 ========================
    let panelDiv = null;
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

    function createFloatingPanel() {
        if (panelDiv) return;
        panelDiv = document.createElement('div');
        panelDiv.id = 'ds-assistant-panel';
        panelDiv.innerHTML = `
            <div class="ds-panel-header">
                <span>DeepSeek 助手</span>
                <span class="ds-panel-controls">
                    <button id="ds-panel-minimize">─</button>
                    <button id="ds-panel-close">✕</button>
                </span>
            </div>
            <div class="ds-panel-content">
                <div class="ds-tab-buttons">
                    <button class="ds-tab-btn active" data-tab="commands">常用命令</button>
                    <button class="ds-tab-btn" data-tab="codeblocks">代码块列表</button>
                </div>
                <div class="ds-tab-content active" id="ds-tab-commands">
                    <div class="ds-commands-list"></div>
                    <div class="ds-add-command">
                        <input type="text" id="ds-new-cmd-name" placeholder="命令名称" maxlength="30">
                        <textarea id="ds-new-cmd-content" placeholder="命令内容" rows="2"></textarea>
                        <button id="ds-add-cmd-btn">添加命令</button>
                    </div>
                    <div class="ds-import-export">
                        <button id="ds-export-data">导出数据</button>
                        <button id="ds-import-data">导入数据</button>
                        <input type="file" id="ds-import-file" accept=".json" style="display:none">
                    </div>
                </div>
                <div class="ds-tab-content" id="ds-tab-codeblocks">
                    <div class="ds-codeblocks-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panelDiv);
        attachDragAndEvents();
        loadPanelPosition();
    }

    function attachDragAndEvents() {
        const header = panelDiv.querySelector('.ds-panel-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.ds-panel-controls')) return;
            isDragging = true;
            const rect = panelDiv.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        function onMouseMove(e) {
            if (!isDragging) return;
            let left = e.clientX - dragOffsetX;
            let top = e.clientY - dragOffsetY;
            left = Math.max(5, Math.min(window.innerWidth - panelDiv.offsetWidth - 5, left));
            top = Math.max(5, Math.min(window.innerHeight - panelDiv.offsetHeight - 5, top));
            panelDiv.style.left = left + 'px';
            panelDiv.style.top = top + 'px';
            panelDiv.style.right = 'auto';
        }
        function onMouseUp() {
            isDragging = false;
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const left = panelDiv.style.left, top = panelDiv.style.top;
            if (left && top) GM_setValue(STORAGE_KEYS.PANEL_POS, { left, top });
        }

        // 最小化/关闭
        const minimize = panelDiv.querySelector('#ds-panel-minimize');
        const close = panelDiv.querySelector('#ds-panel-close');
        const contentDiv = panelDiv.querySelector('.ds-panel-content');
        minimize.addEventListener('click', () => {
            const hidden = contentDiv.style.display === 'none';
            contentDiv.style.display = hidden ? 'flex' : 'none';
        });
        close.addEventListener('click', () => panelDiv.style.display = 'none');

        // Tab切换
        const tabs = panelDiv.querySelectorAll('.ds-tab-btn');
        const contents = panelDiv.querySelectorAll('.ds-tab-content');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                contents.forEach(c => c.classList.remove('active'));
                if (tabId === 'commands') {
                    document.getElementById('ds-tab-commands').classList.add('active');
                } else if (tabId === 'codeblocks') {
                    document.getElementById('ds-tab-codeblocks').classList.add('active');
                    scanAndRenderCodeBlocks();
                }
            });
        });

        // 添加命令
        const addBtn = panelDiv.querySelector('#ds-add-cmd-btn');
        addBtn.addEventListener('click', () => {
            const nameInput = panelDiv.querySelector('#ds-new-cmd-name');
            const contentArea = panelDiv.querySelector('#ds-new-cmd-content');
            const name = nameInput.value.trim();
            const content = contentArea.value.trim();
            if (!name || !content) { alert('请填写命令名称和内容'); return; }
            commands.push({ name, content });
            saveCommands();
            renderCommandsList();
            nameInput.value = '';
            contentArea.value = '';
        });
        // 导出导入
        panelDiv.querySelector('#ds-export-data').addEventListener('click', exportAllData);
        const fileInput = panelDiv.querySelector('#ds-import-file');
        panelDiv.querySelector('#ds-import-data').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => {
            if (e.target.files[0]) importDataFromFile(e.target.files[0]);
        });
    }

    function loadPanelPosition() {
        const pos = GM_getValue(STORAGE_KEYS.PANEL_POS);
        if (pos && pos.left && pos.top) {
            panelDiv.style.left = pos.left;
            panelDiv.style.top = pos.top;
            panelDiv.style.right = 'auto';
        } else {
            panelDiv.style.right = '20px';
            panelDiv.style.top = '80px';
        }
    }

    function renderCommandsList() {
        const container = panelDiv.querySelector('.ds-commands-list');
        if (!container) return;
        if (!commands.length) {
            container.innerHTML = '<div class="ds-empty-tip">暂无命令，添加吧～</div>';
            return;
        }
        let html = '<ul class="ds-commands-ul">';
        commands.forEach((cmd, idx) => {
            html += `
                <li class="ds-command-item">
                    <span class="ds-cmd-name" data-content="${escapeHtml(cmd.content)}">${escapeHtml(cmd.name)}</span>
                    <div class="ds-cmd-actions">
                        <button class="ds-cmd-edit" data-idx="${idx}">编辑</button>
                        <button class="ds-cmd-delete" data-idx="${idx}">删除</button>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
        container.querySelectorAll('.ds-cmd-name').forEach(el => {
            el.addEventListener('click', () => {
                const content = el.dataset.content;
                if (content) insertToInput(content);
            });
        });
        container.querySelectorAll('.ds-cmd-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const cmd = commands[idx];
                const newName = prompt('编辑命令名称', cmd.name);
                if (newName?.trim()) cmd.name = newName.trim();
                const newContent = prompt('编辑命令内容', cmd.content);
                if (newContent !== null) cmd.content = newContent.trim() || cmd.content;
                saveCommands();
                renderCommandsList();
            });
        });
        container.querySelectorAll('.ds-cmd-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                commands.splice(idx, 1);
                saveCommands();
                renderCommandsList();
            });
        });
    }

    function scanAndRenderCodeBlocks() {
        const container = panelDiv.querySelector('.ds-codeblocks-list');
        if (!container) return;
        if (isScrolling) return;
        const codeBlocks = [];
        const pres = document.querySelectorAll('pre, .code-block, .highlight, .ds-markdown pre, .markdown pre');
        for (const pre of pres) {
            const code = pre.querySelector('code') || pre;
            const text = code.innerText.trim();
            if (!text.length) continue;
            let lang = 'text';
            const langMatch = code.className.match(/language-(\w+)/);
            if (langMatch) lang = langMatch[1];
            const preview = text.substring(0, 70).replace(/\n/g, ' ') + (text.length > 70 ? '…' : '');
            let uid = pre.getAttribute('data-ds-uid');
            if (!uid) {
                uid = generateUID();
                pre.setAttribute('data-ds-uid', uid);
            }
            codeBlocks.push({ uid, lang, preview });
        }
        if (!codeBlocks.length) {
            container.innerHTML = '<div class="ds-empty-tip">当前页面没有代码块</div>';
            return;
        }
        let html = '<div class="ds-codeblocks-items">';
        for (const block of codeBlocks) {
            html += `
                <div class="ds-codeblock-item" data-uid="${block.uid}">
                    <div class="ds-codeblock-lang">${escapeHtml(block.lang)}</div>
                    <div class="ds-codeblock-preview">${escapeHtml(block.preview)}</div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('.ds-codeblock-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = item.dataset.uid;
                const target = document.querySelector(`[data-ds-uid="${uid}"]`);
                if (target) {
                    isScrolling = true;
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.transition = 'background 0.2s';
                    target.style.backgroundColor = '#ffffaa';
                    setTimeout(() => {
                        target.style.backgroundColor = '';
                        isScrolling = false;
                        if (panelDiv.querySelector('#ds-tab-codeblocks')?.classList.contains('active')) {
                            scanAndRenderCodeBlocks();
                        }
                    }, 1500);
                }
            });
        });
    }

    function debouncedRefreshCodeBlocks() {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            if (panelDiv && panelDiv.querySelector('#ds-tab-codeblocks')?.classList.contains('active')) {
                if (!isScrolling) scanAndRenderCodeBlocks();
            }
            refreshTimer = null;
        }, 300);
    }

    function observePageChanges() {
        const observer = new MutationObserver(() => debouncedRefreshCodeBlocks());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }

    function saveCommands() { localStorage.setItem(STORAGE_KEYS.COMMANDS, JSON.stringify(commands)); }
    function loadCommands() {
        const stored = localStorage.getItem(STORAGE_KEYS.COMMANDS);
        if (stored) {
            try { commands = JSON.parse(stored); if (!Array.isArray(commands)) commands = []; } catch(e) { commands = []; }
        } else {
            commands = [
                { name: '代码不写注释', content: '请勿添加任何注释，直接给出纯净代码。' }
            ];
        }
        renderCommandsList();
    }

    function exportAllData() {
        const data = { version: '1.6.0', exportTime: new Date().toISOString(), commands };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deepseek_assistant_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    function importDataFromFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.commands && Array.isArray(imported.commands)) {
                    commands = imported.commands;
                    saveCommands();
                    renderCommandsList();
                    alert('导入成功！');
                } else throw new Error();
            } catch { alert('导入失败，文件格式错误'); }
        };
        reader.readAsText(file);
    }

    // 样式
    GM_addStyle(`
        #ds-reading-progress {
            position: fixed; top: 0; left: 0; width: 100%; height: 3px; background: transparent; z-index: 10000; pointer-events: none;
        }
        #ds-reading-progress .ds-progress-fill {
            height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #a855f7, #ec489a);
            border-radius: 0 2px 2px 0; box-shadow: 0 0 4px rgba(59,130,246,0.5); transition: width 0.1s;
        }
        #ds-assistant-panel {
            position: fixed; z-index: 9999; width: 320px; background: #1e1e2f; color: #f0f0f0;
            border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.3); font-family: system-ui; font-size: 12px;
            backdrop-filter: blur(8px); background: rgba(30,30,47,0.96); border: 1px solid #3a3a4a; user-select: none;
            overflow-x: hidden;
        }
        .ds-panel-header {
            display: flex; justify-content: space-between; align-items: center; padding: 5px 8px;
            background: #2a2a3a; border-radius: 6px 6px 0 0; cursor: move; font-weight: 500; border-bottom: 1px solid #3f3f55;
        }
        .ds-panel-controls button {
            background: none; border: none; color: #ccc; font-size: 14px; cursor: pointer;
            margin-left: 6px; border-radius: 3px; width: 24px; text-align: center;
        }
        .ds-panel-controls button:hover { background: #4a4a60; color: white; }
        .ds-panel-content {
            display: flex; flex-direction: column; max-height: 460px; padding: 6px 0 8px 0;
            overflow-x: hidden;
        }
        .ds-tab-buttons {
            display: flex; gap: 2px; padding: 0 8px 6px 8px; border-bottom: 1px solid #3a3a4a;
        }
        .ds-tab-btn {
            background: none; border: none; color: #bbb; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
        }
        .ds-tab-btn.active { background: #3b82f6; color: white; }
        .ds-tab-content { display: none; padding: 6px 8px; overflow-y: auto; max-height: 400px; }
        .ds-tab-content.active { display: block; }
        .ds-commands-list { margin-bottom: 10px; max-height: 220px; overflow-y: auto; }
        .ds-commands-ul { list-style: none; padding: 0; margin: 0; }
        .ds-command-item {
            background: #2c2c3a; margin: 3px 0; padding: 4px 6px; border-radius: 4px;
            display: flex; justify-content: space-between; align-items: center; font-size: 11px;
        }
        .ds-cmd-name { cursor: pointer; font-weight: 500; flex: 1; color: #e0e0ff; }
        .ds-cmd-name:hover { text-decoration: underline; color: #93c5fd; }
        .ds-cmd-actions button {
            background: none; border: none; cursor: pointer; margin-left: 6px; opacity: 0.8; font-size: 10px; color: #ccc;
        }
        .ds-add-command input, .ds-add-command textarea {
            width: 100%; box-sizing: border-box; background: #2a2a36; border: 1px solid #4a4a60; color: white;
            border-radius: 4px; padding: 5px; margin-top: 5px; font-size: 11px;
        }
        .ds-add-command button, .ds-import-export button {
            background: #3b82f6; border: none; color: white; border-radius: 4px; padding: 3px 8px; margin-top: 6px; cursor: pointer; font-size: 11px;
        }
        .ds-import-export { display: flex; gap: 6px; margin-top: 8px; }
        .ds-codeblocks-items { display: flex; flex-direction: column; gap: 5px; }
        .ds-codeblock-item {
            background: #252532; border-radius: 4px; padding: 5px 7px; cursor: pointer; border-left: 2px solid #3b82f6;
        }
        .ds-codeblock-item:hover { background: #32324a; }
        .ds-codeblock-lang { font-weight: 600; font-size: 10px; color: #93c5fd; margin-bottom: 2px; }
        .ds-codeblock-preview { font-family: monospace; font-size: 10px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ds-empty-tip { text-align: center; color: #aaa; padding: 16px; font-size: 11px; }
    `);

    function init() {
        createFloatingPanel();
        loadCommands();
        createProgressBar();
        observePageChanges();
        setTimeout(() => scanAndRenderCodeBlocks(), 1500);
        // 调试输出：确认脚本已加载
        console.log('[DeepSeek助手] 脚本加载完毕，等待命令点击');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
