// ==UserScript==
// @name         云学堂学习助手
// @namespace    https://github.com/your-username/tampermonkey-tool-exts
// @version      1.0
// @description  云学堂自动学习辅助工具：自动播放课程、加速播放、自动切换下一章节、防挂机检测
// @author       YourName
// @match        https://xuexi.yunxuetang.cn/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let runCount = 0;

    // 读取运行次数
    if (window.localStorage.getItem("yxthelper_runcount") !== null) {
        runCount = parseInt(window.localStorage.getItem("yxthelper_runcount"));
    }

    runCount++;
    window.localStorage.setItem("yxthelper_runcount", runCount);

    // 只在奇数次运行时执行（避免重复加载）
    if (runCount % 2 !== 0) {
        window.localStorage.setItem("yxtruntime", "1");

        let elapsedTime = "";
        if (document.getElementsByClassName("jw-text-elapsed")[0]) {
            elapsedTime = document.getElementsByClassName("jw-text-elapsed")[0].innerText;
        }

        // 扩展 Element 原型，添加 trigger 方法
        Element.prototype.trigger = function(eventName) {
            this.dispatchEvent(new Event(eventName));
        };

        // 定时检测并处理防挂机
        setInterval(() => {
            document.querySelector(".yxtulcdsdk-fullsize").__vue__.getCheatInfo().maxMin;
        }, 10000);

        // 主循环：每 2 秒执行一次
        setInterval(() => {
            // 如果播放器未加载，尝试自动开始学习
            if (document.querySelector(".yxtulcdsdk-fullsize") === null) {
                // 点击播放按钮
                if (document.getElementsByClassName("kngpc-playbutton ")[0]) {
                    document.getElementsByClassName("kngpc-playbutton ")[0].trigger("click");
                }

                // 点击「开始学习」按钮
                for (let i = 0; i < document.getElementsByClassName("yxtf-button").length; i++) {
                    if (document.getElementsByClassName("yxtf-button")[i].innerText.indexOf("开始学习") > -1) {
                        document.getElementsByClassName("yxtf-button")[i].trigger("click");
                    }
                }

                // 点击「继续学习」按钮
                for (let i = 0; i < document.getElementsByClassName("yxtf-button").length; i++) {
                    if (document.getElementsByClassName("yxtf-button")[i].innerText.indexOf("继续学习") > -1) {
                        document.getElementsByClassName("yxtf-button")[i].trigger("click");
                    }
                }
            } else {
                // 播放器已加载
                const player = document.querySelector(".yxtulcdsdk-fullsize").__vue__.$refs.player;

                if (player !== undefined) {
                    // 处理重复打开课程的对话框
                    if (document.querySelector(".yxtf-dialog") !== null &&
                        document.querySelector(".yxtf-dialog .mt12") !== null &&
                        document.querySelector(".yxtf-dialog .mt12").innerText === "您已经打开过该课程，系统在同一时间同一课程只会记录一个播放页面的学习进度和学分，确认是否仍在此页面学习？") {
                        location.reload();
                    }

                    // 重新定义 trigger 方法
                    Element.prototype.trigger = function(eventName) {
                        this.dispatchEvent(new Event(eventName));
                    };

                    let chapterList = "";
                    if (document.getElementsByClassName("play-right-li")[0]) {
                        chapterList = document.getElementsByClassName("play-right-li")[0].getElementsByClassName("kng-chapter-title");
                    }

                    // 处理考试预览和自动开始学习
                    if ((document.getElementsByClassName("play-area-title")[0] &&
                         document.getElementsByClassName("play-area-title")[0].innerText.indexOf("可完成本课程学习") >= 0) ||
                        (document.getElementsByClassName("yxtulcdsdk-uexam-preview-container").length > 0 &&
                         !document.getElementsByClassName("yxtulcdsdk-uexam-preview-container")[0].innerText.includes("考试") &&
                         document.getElementsByClassName("yxtf-button")[1])) {
                        document.getElementsByClassName("yxtf-button")[1].trigger("click");
                    }

                    // 重置挂机时间
                    document.querySelector(".yxtulcdsdk-fullsize").__vue__._resetHangUpTime();

                    // 章节导航逻辑
                    if (chapterList !== "" && chapterList.length > 0) {
                        if (document.getElementsByClassName("play-area-title")[0].innerText.indexOf("可完成本课程学习") >= 0) {
                            // 显示当前和下节课程信息
                            for (let i = 0; i < chapterList.length; i++) {
                                if (chapterList[i].classList.contains("color-primary-6") && i < chapterList.length - 2) {
                                    showNotification("当前课程：" + chapterList[i].innerText + "\n,下节课：" + chapterList[i + 1].innerText, 3000);
                                }
                            }
                        } else {
                            // 自动切换到下一章节
                            for (let i = 0; i < chapterList.length; i++) {
                                if (chapterList[i].classList.contains("color-primary-6")) {
                                    console.log("当前课程：" + chapterList[i].innerText);
                                    if (i < chapterList.length - 2) {
                                        elapsedTime = "";
                                        chapterList[i + 1].parentNode.parentNode.trigger("click");
                                    }
                                }
                            }
                        }
                    }

                    // 处理图片类型课程（加速到 6 倍并提交学习时间）
                    if (document.querySelector(".yxtulcdsdk-fullsize").__vue__.$refs.player.mode === "picture") {
                        const vue = document.querySelector(".yxtulcdsdk-fullsize").__vue__;
                        if (vue.rate !== 6) vue.rate = 6;
                        vue.unsavedTime = 12;
                        vue.unsavedActualTime = 2;
                        vue.countdown -= 10;
                        vue.submitStudyTime();
                    }

                    // 根据课程类型处理
                    switch (player.type) {
                        case "ppt":
                        case "pdf":
                            const vue1 = document.querySelector(".yxtulcdsdk-fullsize").__vue__;
                            if (vue1.rate !== 6) vue1.rate = 6;
                            vue1.unsavedTime = 12;
                            vue1.unsavedActualTime = 2;
                            vue1.countdown -= 10;
                            vue1.submitStudyTime();
                            break;

                        case "video":
                            // 检测视频是否卡住，自动切换章节
                            if (document.getElementsByClassName("jw-text-elapsed")[0]) {
                                if (elapsedTime === document.getElementsByClassName("jw-text-elapsed")[0].innerText) {
                                    for (let i = 0; i < chapterList.length; i++) {
                                        if (chapterList[i].classList.contains("color-primary-6")) {
                                            elapsedTime = "";
                                            chapterList[i].parentNode.parentNode.trigger("click");
                                        }
                                    }
                                }
                            } else {
                                for (let i = 0; i < chapterList.length; i++) {
                                    if (chapterList[i].classList.contains("color-primary-6")) {
                                        elapsedTime = "";
                                        chapterList[i].parentNode.parentNode.trigger("click");
                                    }
                                }
                            }

                            if (document.getElementsByClassName("jw-text-elapsed")[0]) {
                                elapsedTime = document.getElementsByClassName("jw-text-elapsed")[0].innerText;
                            }

                            // 自动播放视频
                            const videos = document.getElementsByTagName("video");
                            if (videos.length > 0 && videos[0].paused) {
                                videos[0].play();
                            }

                            // 处理课程完成逻辑
                            if (document.getElementsByClassName("yxtulcdsdk-main")) {
                                if (videos.length > 0 &&
                                    document.getElementsByClassName("yxtulcdsdk-main")[0].innerText.indexOf("可完成本课程学习") === -1) {
                                    // 点击「下一任务」按钮
                                    const buttons = document.querySelectorAll("button");
                                    for (let i = 0; i < buttons.length; i++) {
                                        if (buttons[i].innerText.indexOf("下一任务") > -1) {
                                            buttons[i].trigger("click");
                                        }
                                    }

                                    setTimeout(() => {
                                        if (document.querySelectorAll(".yxtf-dialog__body button")) {
                                            for (let i = 0; i < buttons.length; i++) {
                                                if (buttons[i].innerText.indexOf("确定") > -1) {
                                                    buttons[i].trigger("click");
                                                }
                                            }
                                        }
                                    }, 1000);
                                } else {
                                    // 自动切换章节
                                    const chapters = document.querySelectorAll(".yxtulcdsdk-course-page__info .yxtulcdsdk-course-page__chapter .ellipsis");
                                    if (chapters.length > 0) {
                                        let currentIndex = 0;
                                        for (let i = 0; i < chapters.length; i++) {
                                            if (chapters[i].classList.contains("color-primary-6")) {
                                                currentIndex = i;
                                            }
                                        }

                                        if (currentIndex < chapters.length - 1) {
                                            chapters[currentIndex + 1].parentElement.trigger("click");
                                        } else {
                                            // 点击「下一任务」
                                            const buttons = document.querySelectorAll("button");
                                            for (let i = 0; i < buttons.length; i++) {
                                                if (buttons[i].innerText.indexOf("下一任务") > -1) {
                                                    buttons[i].trigger("click");
                                                }
                                            }

                                            setTimeout(() => {
                                                if (document.querySelectorAll(".yxtf-dialog__body button")) {
                                                    for (let i = 0; i < buttons.length; i++) {
                                                        if (buttons[i].innerText.indexOf("确定") > -1) {
                                                            buttons[i].trigger("click");
                                                        }
                                                    }
                                                }
                                            }, 1000);
                                        }
                                    }
                                }
                            }

                            // 设置 6 倍速并提交学习时间
                            const vue2 = document.querySelector(".yxtulcdsdk-fullsize").__vue__;
                            if (vue2.rate !== 6) window.cyberplayer().setPlaybackRate(6);
                            vue2.submitStudyTime();
                            break;
                    }
                }
            }
        }, 2000);
    }

    // 辅助函数：显示通知
    function showNotification(message, duration) {
        duration = isNaN(duration) ? 3000 : duration;
        const notification = document.createElement("div");
        notification.innerHTML = message;
        notification.style.cssText = "font-family:siyuan;max-width:60%;min-width: 150px;padding:0 14px;height: 40px;color: rgb(255, 255, 255);line-height: 40px;text-align: center;border-radius: 4px;position: fixed;top: 2%;left: 50%;transform: translate(-50%, -50%);z-index: 999999;background: rgba(0, 0, 0,.7);font-size: 16px;margin-top:10px";
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.webkitTransition = "-webkit-transform 0.5s ease-in, opacity 0.5s ease-in";
            notification.style.opacity = "0";
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, duration);
    }
})();
