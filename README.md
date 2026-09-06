# 摄影集

纯静态照片展示页面，信息手动填写，缩略图和 EXIF 由 `tool.js` 生成。

## 快速开始

```bash
# 1. 把照片放入 photos/ 目录

# 2. 安装依赖并生成缩略图 + EXIF
npm install
node tool.js           # 默认按时间倒序（新照片在前）
node tool.js --asc     # 按时间正序（旧照片在前）

# 3. 将终端输出的 PHOTOS 数组复制到 script.js

# 4. 启动本地服务器
npx serve .
```

## 添加照片

在 `script.js` 的 `PHOTOS` 数组中手动填写：

```js
const PHOTOS = [
    {
        src: 'photos/DSC00624.JPG',
        thumbnail: 'photos/thumbnails/DSC00624.jpg',
        title: 'DSC00624',
        date: '2024-03-15 14:30',
        location: '衡水',
        camera: 'SONY ILCE-7M4',
        lens: 'FE 24-70mm F2.8 GM',
        settings: 'f/2.8 | 1/500s | ISO 100 | 70mm',
    },
];
```

空字段在界面上显示为 `-`。

## 项目结构

```
.
├── photos/
│   ├── DSC00624.JPG
│   └── thumbnails/        # tool.js 自动生成
│       └── DSC00624.jpg
├── index.html
├── styles.css
├── script.js              # 照片数据 + 前端逻辑
├── tool.js                # 缩略图生成 + EXIF 读取
└── package.json
```

## 图片预览操作

- 滚轮缩放（0.5x - 3x）
- 鼠标拖拽 / 双击重置
- 键盘 ← → 切换、ESC 关闭
- URL 参数 `?photo=0` 直达某张
