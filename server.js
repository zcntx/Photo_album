const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const exifHelper = require('./exifHelper');

// 配置变量
const PORT = 8000;
const SERVER_DOMAIN = 'localhost'; // 修改此变量以更改域名（例如：'example.com'）
const PHOTOS_DIR = path.join(__dirname, 'photos');
const THUMBNAILS_DIR = path.join(__dirname, 'thumbnails');

// 允许的文件扩展名白名单
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

// EXIF 缓存：key=文件路径，value={ mtime, data }
const exifCache = new Map();

// MIME 类型映射
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
};

// 确保缩略图目录存在
if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// 安全校验：确保解析后的路径在允许的目录内
function isPathSafe(resolvedPath, allowedDir) {
    return resolvedPath.startsWith(allowedDir + path.sep) || resolvedPath === allowedDir;
}

// 获取带缓存的 EXIF 数据
async function getCachedExif(filePath) {
    const stat = fs.statSync(filePath);
    const cached = exifCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) {
        return cached.data;
    }
    const exifData = await exifHelper.extractExifData(filePath);
    const formattedExif = exifHelper.formatExifForDisplay(exifData);
    exifCache.set(filePath, { mtime: stat.mtimeMs, data: formattedExif });
    return formattedExif;
}

// 同步缩略图函数
async function syncThumbnails() {
    console.log('开始同步缩略图...');

    try {
        // 读取照片文件夹
        const photoFiles = fs.readdirSync(PHOTOS_DIR).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ALLOWED_EXTENSIONS.has(ext);
        });

        // 读取缩略图文件夹
        const thumbnailFiles = fs.readdirSync(THUMBNAILS_DIR).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ALLOWED_EXTENSIONS.has(ext);
        });

        console.log(`发现 ${photoFiles.length} 张照片`);
        console.log(`发现 ${thumbnailFiles.length} 个缩略图`);

        // 删除多余的缩略图（照片已删除的情况）
        const photoNames = new Set(photoFiles);
        let deletedCount = 0;
        for (const thumb of thumbnailFiles) {
            if (!photoNames.has(thumb)) {
                const thumbPath = path.join(THUMBNAILS_DIR, thumb);
                fs.unlinkSync(thumbPath);
                deletedCount++;
                console.log(`删除多余缩略图: ${thumb}`);
            }
        }
        if (deletedCount > 0) {
            console.log(`删除了 ${deletedCount} 个多余缩略图`);
        }

        // 生成缺失的缩略图
        const thumbNames = new Set(thumbnailFiles);
        let generatedCount = 0;
        for (const photo of photoFiles) {
            if (!thumbNames.has(photo)) {
                const photoPath = path.join(PHOTOS_DIR, photo);
                const thumbPath = path.join(THUMBNAILS_DIR, photo);

                try {
                    await sharp(photoPath, { failOnError: false })
                        .rotate()
                        .resize(600, 600, {
                            fit: 'cover',
                            kernel: sharp.kernel.lanczos3
                        })
                        .jpeg({
                            quality: 92,
                            mozjpeg: true
                        })
                        .toFile(thumbPath);

                    generatedCount++;
                    console.log(`生成缩略图: ${photo}`);
                } catch (error) {
                    console.error(`生成缩略图失败 ${photo}:`, error.message);
                }
            }
        }
        if (generatedCount > 0) {
            console.log(`生成了 ${generatedCount} 个新缩略图`);
        }

        console.log('缩略图同步完成！');
    } catch (error) {
        console.error('缩略图同步失败:', error);
    }
}

const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    // 处理照片列表请求
    if (pathname === '/api/photos') {
        (async () => {
            try {
                // 从 URL 参数获取排序方式，默认按时间升序排序
                const sortParam = urlObj.searchParams.get('sort') || 'time';

                const files = fs.readdirSync(PHOTOS_DIR);
                const imageFiles = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ALLOWED_EXTENSIONS.has(ext);
                });

                // 并行提取 EXIF 数据
                const photosWithExif = await Promise.all(imageFiles.map(async (file) => {
                    const filePath = path.join(PHOTOS_DIR, file);
                    try {
                        const formattedExif = await getCachedExif(filePath);
                        return { filename: file, exif: formattedExif };
                    } catch (exifErr) {
                        console.error(`Error extracting EXIF from ${file}:`, exifErr);
                        return {
                            filename: file,
                            exif: {
                                date: '-',
                                location: '-',
                                camera: '-',
                                lens: '-',
                                settings: '-'
                            }
                        };
                    }
                }));

                // 排序逻辑（默认升序）
                photosWithExif.sort((a, b) => {
                    if (sortParam === 'name') {
                        // 按文件名排序（不区分大小写）
                        return a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' });
                    } else {
                        // 默认按时间排序（使用 EXIF 日期或文件名作为后备）
                        const dateA = a.exif.date && a.exif.date !== '-' ? a.exif.date : a.filename;
                        const dateB = b.exif.date && b.exif.date !== '-' ? b.exif.date : b.filename;
                        return dateA.localeCompare(dateB);
                    }
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ photos: photosWithExif }));
            } catch (err) {
                console.error('Error reading photos directory:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无法读取照片文件夹' }));
            }
        })();
        return;
    }

    // 处理缩略图请求
    if (pathname.startsWith('/thumbnails/')) {
        const filename = pathname.split('/').pop();
        const ext = path.extname(filename).toLowerCase();

        // 安全：检查扩展名白名单
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('禁止访问');
            return;
        }

        const thumbnailPath = path.resolve(THUMBNAILS_DIR, filename);
        const originalPath = path.resolve(PHOTOS_DIR, filename);

        // 安全：路径遍历检查
        if (!isPathSafe(thumbnailPath, THUMBNAILS_DIR) && !isPathSafe(originalPath, PHOTOS_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('禁止访问');
            return;
        }

        // 检查缩略图是否已存在
        if (fs.existsSync(thumbnailPath)) {
            res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=2592000, immutable',
                'Expires': new Date(Date.now() + 2592000000).toUTCString()
            });
            fs.createReadStream(thumbnailPath).pipe(res);
            return;
        }

        // 生成缩略图
        (async () => {
            try {
                if (!fs.existsSync(originalPath)) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('文件未找到');
                    return;
                }

                await sharp(originalPath, { failOnError: false })
                    .rotate() // 自动根据 EXIF 方向旋转
                    .resize(600, 600, {
                        fit: 'cover',
                        kernel: sharp.kernel.lanczos3 // 使用高质量缩放算法
                    })
                    .jpeg({
                        quality: 92,  // 提高质量到 92%
                        mozjpeg: true // 使用 MozJPEG 优化
                    })
                    .toFile(thumbnailPath);

                res.writeHead(200, {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'public, max-age=2592000, immutable',
                    'Expires': new Date(Date.now() + 2592000000).toUTCString()
                });
                fs.createReadStream(thumbnailPath).pipe(res);
            } catch (error) {
                console.error('生成缩略图失败:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('生成缩略图失败');
            }
        })();
        return;
    }

    // 处理原始照片文件请求
    if (pathname.startsWith('/photos/')) {
        const filename = pathname.split('/').pop();
        const ext = path.extname(filename).toLowerCase();

        // 安全：检查扩展名白名单
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('禁止访问');
            return;
        }

        const photoPath = path.resolve(PHOTOS_DIR, filename);

        // 安全：路径遍历检查
        if (!isPathSafe(photoPath, PHOTOS_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('禁止访问');
            return;
        }

        if (fs.existsSync(photoPath)) {
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=2592000, immutable',
                'Expires': new Date(Date.now() + 2592000000).toUTCString()
            });
            fs.createReadStream(photoPath).pipe(res);
            return;
        }
    }

    // 处理静态文件
    let filePath;
    if (pathname === '/') {
        filePath = path.join(__dirname, 'index.html');
    } else {
        filePath = path.join(__dirname, pathname);
    }

    // 安全：静态文件路径遍历检查
    const resolvedFilePath = path.resolve(filePath);
    if (!isPathSafe(resolvedFilePath, __dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('禁止访问');
        return;
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(resolvedFilePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('文件未找到');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('服务器错误');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// 启动服务器前先同步缩略图
syncThumbnails().then(() => {
    server.listen(PORT, () => {
        console.log(`服务器运行在 http://${SERVER_DOMAIN}:${PORT}`);
        console.log(`照片文件夹: ${PHOTOS_DIR}`);
        console.log(`缩略图文件夹: ${THUMBNAILS_DIR}`);
    });
});
