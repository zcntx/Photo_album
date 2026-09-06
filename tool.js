/*
  照片工具 — 生成缩略图 + 读取 EXIF
  用法: node tool.js [--asc]
  参数: --asc  按时间正序排列（旧照片在前），默认倒序（新照片在前）
  输出: photos/thumbnails/ 目录 + 可直接粘贴到 PHOTOS 数组的代码
*/
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const exifr = require('exifr');

const PHOTOS_DIR = path.join(__dirname, 'photos');
const THUMB_DIR = path.join(PHOTOS_DIR, 'thumbnails');
const THUMB_WIDTH = 600;

// 解析命令行参数
const args = process.argv.slice(2);
const SORT_ASC = args.includes('--asc');

async function main() {
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

  const files = fs.readdirSync(PHOTOS_DIR).filter(f => /\.(jpe?g|tiff?|png|heic|heif)$/i.test(f));
  if (files.length === 0) {
    console.log('photos/ 目录中没有图片文件');
    return;
  }

  const results = [];

  for (const file of files) {
    const srcPath = path.join(PHOTOS_DIR, file);
    const thumbName = path.parse(file).name + '.jpg';
    const thumbPath = path.join(THUMB_DIR, thumbName);

    // 生成缩略图
    try {
      await sharp(srcPath)
        .rotate()
        .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
      console.log(`✓ 缩略图: ${thumbName}`);
    } catch (e) {
      console.warn(`✗ 缩略图失败 [${file}]:`, e.message);
    }

    // 读取 EXIF
    const entry = { src: `photos/${file}`, thumbnail: `photos/thumbnails/${thumbName}` };
    try {
      const exif = await exifr.parse(srcPath, {
        tiff: true, xmp: true, icc: false, iptc: false, jfif: false, ihdr: false,
      });
      if (exif) {
        const date = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
        if (date) entry.date = formatDate(date);

        const make = exif.Make || '';
        const model = (exif.Model || '').replace(make, '').trim();
        if (make || model) entry.camera = `${make} ${model}`.trim();

        if (exif.LensModel) entry.lens = String(exif.LensModel).trim();

        const parts = [];
        if (exif.FNumber != null) parts.push(`f/${exif.FNumber}`);
        if (exif.ExposureTime != null) {
          parts.push(exif.ExposureTime < 1
            ? `1/${Math.round(1 / exif.ExposureTime)}s`
            : `${exif.ExposureTime}s`);
        }
        if (exif.ISO != null) parts.push(`ISO ${exif.ISO}`);
        if (exif.FocalLength != null) parts.push(`${Math.round(exif.FocalLength)}mm`);
        if (parts.length) entry.settings = parts.join(' | ');

        // GPS
        const gps = (exif.GPSLatitude != null && exif.GPSLongitude != null)
          ? `${exif.GPSLatitude.toFixed(4)}, ${exif.GPSLongitude.toFixed(4)}`
          : '';
        entry.location = gps || '';
      }
    } catch (e) {
      console.warn(`✗ EXIF 失败 [${file}]:`, e.message);
    }

    // 标题用文件名
    entry.title = path.parse(file).name;

    results.push(entry);
    console.log(`✓ EXIF:   ${file}`);
  }

  // 按日期排序
  results.sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return SORT_ASC ? dateA - dateB : dateB - dateA;
  });
  console.log(`\n✓ 已按拍摄时间${SORT_ASC ? '正序' : '倒序'}排列`);

  console.log('\n--- 复制以下内容到 script.js 的 PHOTOS 数组 ---\n');
  console.log(formatOutput(results));
}

function formatDate(dateStr) {
  try {
    const str = String(dateStr).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

function formatOutput(entries) {
  return 'const PHOTOS = [\n' + entries.map(e => {
    const lines = [];
    lines.push(`    {`);
    lines.push(`        src: '${e.src}',`);
    lines.push(`        thumbnail: '${e.thumbnail}',`);
    lines.push(`        title: '${e.title}',`);
    lines.push(`        date: '${e.date || ''}',`);
    lines.push(`        location: '${e.location || ''}',`);
    lines.push(`        camera: '${e.camera || ''}',`);
    lines.push(`        lens: '${e.lens || ''}',`);
    lines.push(`        settings: '${e.settings || ''}',`);
    lines.push(`    },`);
    return lines.join('\n');
  }).join('\n') + '\n];';
}

main().catch(e => { console.error(e); process.exit(1); });
