# HoloTree 3D 🎄✨

**HoloTree 3D** 是一个极具未来感的互动式 3D 圣诞树体验项目。它利用 AI 手势识别技术，结合 WebGL 粒子特效，让用户通过手势与全息圣诞树进行互动，唤醒记忆照片，并探索藏在树下的许愿盲盒。

**🌐 在线演示 (Live Demo):** [https://weigesture-magic-tree.xyz](https://weigesture-magic-tree.xyz)

![Project Preview](./preview.png)

---

## 🌟 核心亮点 (Features)

*   **🖐️ AI 手势控制**: 基于 MediaPipe 深度集成，无需鼠标键盘，挥挥手即可掌控全场。
*   **🌌 沉浸式 3D 粒子系统**: 数千个粒子组成的动态圣诞树，支持多种形态变换（树形态、星系形态、爱心形态）。
*   **📸 全息回忆相册**: 支持用户上传照片，照片将以全息卡片的形式环绕在树周围，随手势律动。
*   **🎁 互动许愿盲盒**: 
    *   树下的礼物盒不仅是装饰，点击它们会蹦出惊喜。
    *   **Make a Wish**: 用户可以写下自己的愿望，藏进盲盒里等待被发现。
*   **🎵 氛围音乐播放器**: 内置多首圣诞经典曲目，支持上传自定义背景音乐。
*   **🚀 浏览器优化模式**: 使用 Electron 作为启动器，自动唤起系统默认浏览器，确保 AI 性能和兼容性最佳。

---

## 🎮 手势操作指南 (Gesture Guide)

体验的核心在于你的双手！请确保摄像头能清晰捕捉到你的手部动作。

| 动作 | 手势名称 | 触发效果 | 视觉反馈 |
| :--- | :--- | :--- | :--- |
| **🖐️ 单手张开** | **Scatter Magic (魔法散射)** | 粒子像星尘一样松散飘舞，照片环绕速度变慢，适合静静欣赏。 | 粒子轻微扩散 |
| **👐 双手张开** | **Big Bang (星系爆发)** | 模拟宇宙大爆炸，所有粒子和照片向外猛烈扩散，极具视觉冲击力。 | 粒子爆发式扩散 |
| **☝️ 食指指引** | **Focus Mode (聚焦回忆)** | 像科幻电影一样，选中的照片会飞到屏幕正中央放大显示。 | 照片放大，背景变暗 |
| **🫶 双手比心** | **Love Magic (爱心魔法)** | 所有的粒子会汇聚成一个巨大的 3D 爱心，照片也会随之变成心形排列。 | 粒子聚合成爱心形状 |
| **✊ 握拳/自然** | **Tree Mode (圣诞树)** | 粒子回归经典的圆锥体圣诞树形态，顶部的星星闪耀。 | 经典的旋转圣诞树 |

> **提示**: 如果环境光线较暗，手势识别可能会受影响。

---

## 🚀 快速开始 (Getting Started)

### 环境要求
*   Node.js (v16 或更高版本)
*   npm 或 yarn

### 1. 克隆项目
```bash
git clone https://github.com/your-username/holotree-3d.git
cd holotree-3d
```

### 2. 安装依赖
```bash
npm install
# 或者
yarn install
```

### 3. 开发模式运行
```bash
# 启动 Web 浏览器模式
npm run dev

# 启动 桌面应用开发模式
npm run electron:dev
```

---

## 📦 打包为 EXE (Build Executable)

想要生成 Windows 可执行文件 (.exe) 分享给朋友？

1.  **运行构建命令**:
    ```bash
    npm run electron:build
    ```

2.  **查找文件**:
    打包完成后，可执行文件将生成在 `release/` 目录下。

> **注意**: 该程序现在是一个“启动器 (Launcher)”，运行 EXE 后会打开一个小窗口并自动跳转到你的浏览器中运行，这是为了解决手势识别库在 Electron 内部的兼容性问题。

---

## 🛠️ 技术栈 (Tech Stack)

*   **核心框架**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **桌面封装**: [Electron](https://www.electronjs.org/)
*   **3D 渲染**: [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
*   **AI 视觉**: [MediaPipe Hands](https://developers.google.com/mediapipe) (用于实时手部追踪)
*   **UI 样式**: [Tailwind CSS](https://tailwindcss.com/)
*   **后期处理**: @react-three/postprocessing (Bloom, Vignette)

---

## 🆘 Electron Main Process Code (Launcher)

如果你需要手动修复或查看 `electron/main.cjs` 的代码，请参考以下内容。这段代码创建了一个本地静态文件服务器，并唤起默认浏览器。

**File: `electron/main.cjs`**

```javascript
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 54321;
// Determine if we are in dev mode based on npm script or env
const isDev = process.env.npm_lifecycle_event === 'electron:dev' || !app.isPackaged;

// FIXED: Path to the built files
// In both Dev (unpacked) and Prod (packaged in asar), the relative structure 
// between electron/main.cjs and dist/ folder is preserved by electron-builder configuration.
// So we simply go up one level from this file.
const DIST_DIR = path.join(__dirname, '../dist');

let server;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

function startServer() {
  server = http.createServer((request, response) => {
    // Basic security: prevent directory traversal
    const safePath = path.normalize(request.url).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);
    
    // Remove query strings
    filePath = filePath.split('?')[0];

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if(error.code == 'ENOENT'){
          // SPA Fallback: If file not found, serve index.html (for React Router etc)
          const fallbackPath = path.join(DIST_DIR, 'index.html');
          fs.readFile(fallbackPath, (err, indexContent) => {
             if (err) {
                 console.error(`Failed to load fallback index.html from: ${fallbackPath}`);
                 response.writeHead(500);
                 response.end(`Error loading index.html from "${DIST_DIR}". Did you run "npm run build"?`);
             } else {
                 response.writeHead(200, { 'Content-Type': 'text/html' });
                 response.end(indexContent, 'utf-8');
             }
          });
        } else {
          response.writeHead(500);
          response.end('Server Error: ' + error.code);
        }
      } else {
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content, 'utf-8');
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Serving files from: ${DIST_DIR}`);
    shell.openExternal(`http://localhost:${PORT}`);
  });
}

function createWindow() {
  // Create a small "Launcher" window to keep the process alive
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    title: "HoloTree Launcher",
    autoHideMenuBar: true,
    backgroundColor: '#050510',
    // icon: path.join(__dirname, '../public/icon.png'), // If you have an icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const statusText = isDev ? 'Development Mode (Vite)' : 'Production Mode (Static)';
  const targetUrl = isDev ? 'http://localhost:5173' : `http://localhost:${PORT}`;

  // Simple HTML status page for the launcher window
  const statusHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>HoloTree Launcher</title>
      <style>
        body { background:#050510; color:#ffd966; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center; margin:0; user-select:none; }
        h3 { margin: 0 0 10px 0; font-family: serif; font-style: italic; font-size: 24px; }
        p { opacity:0.7; font-size: 14px; margin: 5px 0; color: #fff; }
        .url { font-family:monospace; color:#666; font-size: 12px; margin-bottom: 20px; }
        .btn { margin-top:10px; padding:8px 16px; background:rgba(255,217,102,0.1); border:1px solid #ffd966; color:#ffd966; cursor:pointer; border-radius:4px; font-size:12px; text-transform:uppercase; letter-spacing:1px; transition:0.2s; min-width: 120px; }
        .btn:hover { background:rgba(255,217,102,0.3); }
        .btn.danger { border-color:#ff4444; color:#ff4444; background:rgba(255,68,68,0.1); }
        .btn.danger:hover { background:rgba(255,68,68,0.3); }
        .pulse { width: 12px; height: 12px; background: #00ff00; border-radius: 50%; box-shadow: 0 0 15px #00ff00; margin-bottom: 20px; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
      </style>
    </head>
    <body>
      <div class="pulse"></div>
      <h3>HoloTree Running</h3>
      <p>${statusText}</p>
      <p>App opened in your default browser.</p>
      <p class="url">${targetUrl}</p>
      <button class="btn" onclick="require('electron').ipcRenderer.send('reopen')">Re-open Browser</button>
      <button class="btn danger" onclick="window.close()">Exit App</button>
    </body>
    </html>
  `;
  
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(statusHtml)}`);
}

app.whenReady().then(() => {
  if (isDev) {
    // In dev mode, we assume 'npm run electron:dev' is used, which starts Vite separately.
    // We just open the URL.
    createWindow();
    shell.openExternal('http://localhost:5173');
  } else {
    // In production, we start our own static server.
    startServer();
    createWindow();
  }
});

// Handle re-open request from button
ipcMain.on('reopen', () => {
  if (isDev) {
    shell.openExternal('http://localhost:5173');
  } else {
    shell.openExternal(`http://localhost:${PORT}`);
  }
});

app.on('window-all-closed', () => {
  if (server) server.close();
  app.quit();
});