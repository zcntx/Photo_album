/**
 * EXIF 数据处理模块
 * 专门用于读取照片参数并显示在放大后的图片展示中
 */

const exifr = require('exifr');

/**
 * 从照片文件提取 EXIF 数据
 * @param {string} filePath - 照片文件路径
 * @returns {Promise<Object>} EXIF 数据对象
 */
async function extractExifData(filePath) {
    try {
        // 使用 exifr 的 tiff 选项来获取原始字符串格式的日期
        const exifData = await exifr.parse(filePath, {
            tiff: true,
            ifd0: true,
            exif: true,
            gps: true,
            // 关键：使用 tiff: true 来获取原始 EXIF 数据
            // exifr 会自动处理时区偏移
        });

        if (!exifData) {
            return {
                date: null,
                location: null,
                camera: null,
                lens: null,
                settings: null
            };
        }

        return {
            date: extractDate(exifData),
            location: extractLocation(exifData),
            camera: extractCamera(exifData),
            lens: extractLens(exifData),
            settings: extractSettings(exifData)
        };
    } catch (error) {
        console.error('EXIF 提取失败:', error);
        return {
            date: null,
            location: null,
            camera: null,
            lens: null,
            settings: null
        };
    }
}

/**
 * 提取拍摄日期
 */
function extractDate(exifData) {
    // 优先使用 OffsetTimeOriginal 来获取时区信息
    const offsetTime = exifData.OffsetTimeOriginal || exifData.OffsetTime || exifData.OffsetTimeDigitized;

    // 获取原始日期时间字符串（如果可用）
    // exifr 可能会返回 Date 对象，我们需要检查是否有原始字符串
    let dateValue = exifData.DateTimeOriginal || exifData.DateTime || exifData.CreateDate;

    if (!dateValue) return null;

    // 如果是 Date 对象，使用时区偏移来格式化
    if (dateValue instanceof Date) {
        // 如果有时区偏移信息，使用它来格式化
        if (offsetTime) {
            // 创建一个新的日期对象，应用时区偏移
            const localDate = new Date(dateValue.getTime() + (parseOffset(offsetTime) * 60 * 60 * 1000));
            return localDate.toISOString().replace('T', ' ').substring(0, 19);
        } else {
            // 默认使用本地时间显示
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            const hours = String(dateValue.getHours()).padStart(2, '0');
            const minutes = String(dateValue.getMinutes()).padStart(2, '0');
            const seconds = String(dateValue.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
    }

    // 如果是字符串格式（EXIF 原始格式）
    if (typeof dateValue === 'string') {
        // EXIF 日期格式通常是 "YYYY:MM:DD HH:MM:SS" 或 ISO 格式
        if (dateValue.includes('T')) {
            // ISO 格式：2026-02-28T10:13:42.000Z
            const date = new Date(dateValue);
            if (offsetTime) {
                const localDate = new Date(date.getTime() + (parseOffset(offsetTime) * 60 * 60 * 1000));
                return localDate.toISOString().replace('T', ' ').substring(0, 19);
            } else {
                return date.toISOString().replace('T', ' ').substring(0, 19);
            }
        } else if (dateValue.includes(':')) {
            // EXIF 格式：YYYY:MM:DD HH:MM:SS
            // 只替换日期部分的冒号，保留时间部分的冒号
            const parts = dateValue.split(' ');
            if (parts.length >= 2) {
                const datePart = parts[0].replace(/:/g, '-');
                const timePart = parts[1];
                return `${datePart} ${timePart}`;
            }
            return dateValue.replace(/:/g, '-');
        }
    }

    // 尝试转换为字符串
    return String(dateValue);
}

/**
 * 解析时区偏移字符串（如 "+08:00"）为小时数
 */
function parseOffset(offsetStr) {
    if (!offsetStr) return 0;
    const match = offsetStr.match(/([+-])(\d{2}):(\d{2})/);
    if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        return sign * (hours + minutes / 60);
    }
    return 0;
}

/**
 * 提取地理位置
 */
function extractLocation(exifData) {
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
        try {
            let lat = convertGPSCoordinate(exifData.GPSLatitude);
            let lon = convertGPSCoordinate(exifData.GPSLongitude);

            if (lat !== null && lon !== null) {
                return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
            }
        } catch (error) {
            console.error('解析 GPS 坐标失败:', error);
        }
    }
    return null;
}

/**
 * 将 GPS 坐标转换为十进制度数
 * 支持数组格式 [度, 分, 秒] 或纯数字格式
 */
function convertGPSCoordinate(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (Array.isArray(value)) {
        if (value.length >= 3) {
            // [度, 分, 秒] -> 十进制度
            return value[0] + value[1] / 60 + value[2] / 3600;
        }
        if (value.length >= 1) {
            return value[0];
        }
    }
    return null;
}

/**
 * 提取相机信息
 */
function extractCamera(exifData) {
    if (exifData.Make && exifData.Model) {
        return `${exifData.Make} ${exifData.Model}`;
    }
    return exifData.Model || exifData.Make || null;
}

/**
 * 提取镜头信息
 */
function extractLens(exifData) {
    return exifData.LensModel || exifData.Lens || exifData.LensMake || null;
}

/**
 * 提取拍摄参数
 */
function extractSettings(exifData) {
    const settings = {};

    // 光圈
    if (exifData.FNumber) {
        settings.fNumber = exifData.FNumber;
    }

    // 快门速度
    if (exifData.ExposureTime) {
        settings.exposureTime = exifData.ExposureTime;
    }

    // ISO
    if (exifData.ISO || exifData.ISOSpeedRatings) {
        settings.iso = exifData.ISO || exifData.ISOSpeedRatings;
    }

    // 焦距 - 优先使用35mm等效焦距，如果没有则使用实际焦距
    if (exifData.FocalLengthIn35mmFormat) {
        settings.focalLength = exifData.FocalLengthIn35mmFormat;
    } else if (exifData.FocalLength) {
        settings.focalLength = exifData.FocalLength;
    }

    return Object.keys(settings).length > 0 ? settings : null;
}

/**
 * 格式化 EXIF 数据为前端显示格式
 * @param {Object} exifData - 提取的 EXIF 数据
 * @returns {Object} 格式化后的显示数据
 */
function formatExifForDisplay(exifData) {
    if (!exifData) {
        return {
            date: '-',
            location: '-',
            camera: '-',
            lens: '-',
            settings: '-'
        };
    }

    const formatted = {
        date: exifData.date || '-',
        location: exifData.location || '-',
        camera: exifData.camera || '-',
        lens: exifData.lens || '-',
        settings: '-'
    };

    // 格式化设置参数
    if (exifData.settings && typeof exifData.settings === 'object') {
        const settings = [];
        const s = exifData.settings;

        // 光圈
        if (s.fNumber) {
            let aperture = null;
            if (typeof s.fNumber === 'number') {
                aperture = s.fNumber;
            } else if (Array.isArray(s.fNumber) && s.fNumber.length >= 2) {
                aperture = s.fNumber[0] / s.fNumber[1];
            }
            if (aperture) {
                // 处理特殊情况：某些相机存储 f-number 为整数（例如 53 表示 f/5.3）
                if (aperture > 20 && aperture < 100) {
                    aperture = aperture / 10;
                }
                settings.push(`f/${aperture.toFixed(1)}`);
            }
        }

        // 快门速度
        if (s.exposureTime) {
            let shutterSpeed = '';
            if (typeof s.exposureTime === 'number') {
                if (s.exposureTime < 1) {
                    shutterSpeed = `1/${Math.round(1 / s.exposureTime)}s`;
                } else {
                    shutterSpeed = `${s.exposureTime}s`;
                }
            } else if (Array.isArray(s.exposureTime) && s.exposureTime.length >= 2) {
                const num = s.exposureTime[0];
                const den = s.exposureTime[1];
                if (num < den) {
                    shutterSpeed = `1/${Math.round(den / num)}s`;
                } else {
                    shutterSpeed = `${num / den}s`;
                }
            }
            if (shutterSpeed) settings.push(shutterSpeed);
        }

        // ISO
        if (s.iso) {
            settings.push(`ISO ${s.iso}`);
        }

        // 焦距
        if (s.focalLength) {
            let focal = null;
            if (typeof s.focalLength === 'number') {
                focal = s.focalLength;
            } else if (Array.isArray(s.focalLength) && s.focalLength.length >= 2) {
                focal = s.focalLength[0] / s.focalLength[1];
            }
            if (focal) {
                settings.push(`${focal}mm`);
            }
        }

        formatted.settings = settings.length > 0 ? settings : '-';
    }

    return formatted;
}

module.exports = {
    extractExifData,
    formatExifForDisplay
};
