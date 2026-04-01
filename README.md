# 摄影集展示网页

一个简约现代的摄影集展示网页，支持 EXIF 数据读取、暗色模式、响应式设计和分享功能。

## 功能特点

- **EXIF 数据读取**：自动读取照片的拍摄日期、地点、相机型号、镜头信息和拍摄参数
- **响应式设计**：适配桌面端和移动端设备
- **无限滚动**：自动加载更多照片，无需分页
- **图片预览**：点击照片可放大查看，支持缩放和拖拽
- **键盘导航**：支持左右箭头切换照片，ESC 关闭预览

## 安装和运行

### 前置要求

- Node.js (建议版本 14+)
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 运行服务器

```bash
npm start
```

服务器将在 `http://localhost:8000` 启动。

### 添加照片

将照片放入项目根目录下的 `photos` 文件夹中。服务器会自动：
1. 读取照片的 EXIF 数据
2. 生成缩略图（存放在 `thumbnails` 文件夹）
3. 在网页中展示

## 项目结构

```
.
├── photos/              # 照片文件夹（需手动创建）
├── thumbnails/          # 缩略图文件夹（自动生成）
├── index.html           # 主页面
├── styles.css           # 样式文件
├── script.js            # 前端 JavaScript
├── server.js            # Node.js 服务器
├── exifHelper.js        # EXIF 数据处理模块
├── package.json         # 项目配置
└── README.md            # 说明文档
```

## 技术栈

- **后端**：Node.js + 原生 HTTP 模块
- **前端**：HTML5 + CSS3 + 原生 JavaScript
- **EXIF 处理**：exifr 库
- **图片处理**：Sharp 库（生成缩略图）

## 配置

在 `server.js` 中可以修改以下配置：

```javascript
const PORT = 8000;                    // 服务器端口
const SERVER_DOMAIN = 'localhost';    // 服务器域名
const PHOTOS_DIR = path.join(__dirname, 'photos');  // 照片文件夹路径
```

## 功能说明

### EXIF 数据展示

点击照片后，模态框会显示以下信息：
- 📅 拍摄日期
- 📍 地点（GPS 坐标）
- 📷 相机型号
- 🔭 镜头型号
- ⚙️ 拍摄参数（光圈、快门、ISO、焦距）

### 图片预览操作

- **缩放**：鼠标滚轮缩放图片（0.5x - 3x）
- **拖拽**：按住鼠标拖动查看放大后的图片
- **重置**：双击图片重置缩放和位置
- **导航**：左右箭头切换照片
- **关闭**：ESC 键或点击关闭按钮

### URL 分享

每个照片都有独立的 URL，格式为：
```
http://localhost:8000?photo=照片文件名.jpg
```

直接复制 URL 即可分享给他人。

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 开发说明

### 添加新功能

1. 前端修改：编辑 `script.js` 和 `styles.css`
2. 后端修改：编辑 `server.js` 和 `exifHelper.js`
3. 重启服务器以应用更改

### 调试

- 浏览器开发者工具（F12）
- 服务器日志会显示 EXIF 读取错误和缩略图生成状态

## 许可证

ISC

## 更新日志

### v1.0.0
- 初始版本
- 支持 EXIF 数据读取
- 添加无限滚动和图片预览功能
