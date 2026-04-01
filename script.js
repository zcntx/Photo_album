// 摄影集展示网页 - JavaScript (重构版)

// DOM 元素
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const photoTitle = document.getElementById('photo-title');
const photoDate = document.getElementById('photo-date');
const photoLocation = document.getElementById('photo-location');
const photoCamera = document.getElementById('photo-camera');
const photoLens = document.getElementById('photo-lens');
const photoSettings = document.getElementById('photo-settings');
const toast = document.getElementById('toast');
const closeBtn = document.querySelector('.close-btn');
const loadingScreen = document.getElementById('loading-screen');
const quoteText = document.getElementById('quote-text');

// 名言列表
const quotes = [
    "摄影是光的艺术。",
    "一张照片胜过千言万语。",
    "最好的相机是你随身携带的那一台。",
    "摄影是发现生活中被忽视的美。",
    "通过镜头，我看到了不同的世界。",
    "每一张照片都是一个故事。",
    "摄影是捕捉时间的艺术。",
    "光是摄影的灵魂。",
    "摄影是观察的艺术，是在平凡中发现不平凡。",
    "相机是思想的工具，眼睛是灵魂的窗户。",
    "摄影是凝固时间的魔法。",
    "每一张照片都是对现实的重新诠释。",
    "摄影是记录生活的方式，也是表达情感的语言。",
    "通过摄影，我们可以看到世界的另一面。",
    "摄影是光与影的舞蹈。"
];

// 状态
let photos = [];
let allPhotosData = [];
let currentPhotoIndex = 0;
let isLoading = false;

// 缩放状态
let zoomScale = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;
let initialPinchDistance = null;
let initialScale = 1;
let isPinching = false;

// 排序状态
let currentSort = 'time'; // 'time' 或 'name'

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    showRandomQuote();
    setupSortControls();
    setupEventListeners();
    setupZoomFunctionality();

    const loadStartTime = Date.now();
    const MIN_DISPLAY_TIME = 500;

    loadPhotos().then(() => {
        checkUrlParams();
    }).finally(() => {
        // 确保加载屏至少显示 MIN_DISPLAY_TIME（防止闪烁），但不超过 2.5 秒
        const elapsed = Date.now() - loadStartTime;
        const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);
        setTimeout(hideLoadingScreen, remaining);
    });
});

// 显示随机名言
function showRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    quoteText.textContent = quotes[randomIndex];
}

// 隐藏加载屏
function hideLoadingScreen() {
    loadingScreen.classList.add('hidden');
}

// 设置排序控件
function setupSortControls() {
    const header = document.querySelector('header');

    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-controls';

    const sortButton = document.createElement('button');
    sortButton.id = 'sortButton';
    sortButton.className = 'sort-button';
    sortButton.textContent = '时间';
    sortButton.title = '点击切换排序方式';

    sortContainer.appendChild(sortButton);
    header.appendChild(sortContainer);

    sortButton.addEventListener('click', () => {
        currentSort = currentSort === 'time' ? 'name' : 'time';
        sortButton.textContent = currentSort === 'time' ? '时间' : '名字';
        resetAndReloadPhotos();
    });
}

// 重置并重新加载照片
function resetAndReloadPhotos() {
    window.scrollTo(0, 0);

    gallery.style.opacity = '0';
    gallery.style.transform = 'translateY(-10px)';
    gallery.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    setTimeout(() => {
        photos = [];
        allPhotosData = [];
        gallery.innerHTML = '';

        gallery.style.opacity = '0';
        gallery.style.transform = 'translateY(10px)';
        gallery.offsetHeight;

        requestAnimationFrame(() => {
            gallery.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            gallery.style.opacity = '1';
            gallery.style.transform = 'translateY(0)';

            loadPhotos();
        });
    }, 200);
}

// 加载照片
async function loadPhotos() {
    if (isLoading) return;
    isLoading = true;

    try {
        const url = `/api/photos?sort=${currentSort}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.photos || data.photos.length === 0) {
            gallery.innerHTML = '<div class="loading">暂无照片，请在 photos 文件夹中添加照片</div>';
            isLoading = false;
            return;
        }

        allPhotosData = data.photos;
        photos = [];
        gallery.innerHTML = '';

        data.photos.forEach(photoInfo => {
            const photoData = {
                path: `/photos/${photoInfo.filename}`,
                filename: photoInfo.filename,
                title: photoInfo.filename.split('.')[0],
                exif: photoInfo.exif || {
                    date: '-',
                    location: '-',
                    camera: '-',
                    lens: '-',
                    settings: '-'
                },
                thumbnail: `/thumbnails/${photoInfo.filename}`
            };

            photos.push(photoData);
            renderPhotoCard(photoData, photos.length - 1);
        });

        isLoading = false;
        hideLoadingScreen();
    } catch (error) {
        console.error('加载照片失败:', error);
        gallery.innerHTML = '<div class="loading">加载照片失败，请检查 photos 文件夹</div>';
        isLoading = false;
        hideLoadingScreen();
    }
}

// 渲染单张照片卡片
function renderPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.dataset.index = index;

    const delay = Math.min(index * 30, 500);
    card.style.animationDelay = `${delay}ms`;

    const img = document.createElement('img');
    img.src = photo.thumbnail;
    img.alt = photo.title;
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';

    const h3 = document.createElement('h3');
    h3.textContent = photo.title;

    const dateDiv = document.createElement('div');
    dateDiv.className = 'date';
    dateDiv.textContent = photo.exif.date;

    overlay.appendChild(h3);
    overlay.appendChild(dateDiv);
    card.appendChild(img);
    card.appendChild(overlay);

    card.addEventListener('click', () => openModal(index));
    gallery.appendChild(card);
}

// 重置缩放状态
function resetZoom() {
    zoomScale = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();
}

// 打开模态框
function openModal(index) {
    currentPhotoIndex = index;
    const photo = photos[index];

    modalImage.src = photo.path;
    photoTitle.textContent = photo.filename;
    photoDate.textContent = photo.exif.date;
    photoLocation.textContent = photo.exif.location;
    photoCamera.textContent = photo.exif.camera;
    photoLens.textContent = photo.exif.lens;

    // settings 现在可能是数组或字符串
    if (Array.isArray(photo.exif.settings)) {
        photoSettings.textContent = photo.exif.settings.join(' | ');
    } else {
        photoSettings.textContent = photo.exif.settings;
    }

    resetZoom();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    const url = new URL(window.location);
    url.searchParams.set('photo', photo.filename);
    window.history.pushState({}, '', url);
}

// 关闭模态框
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    const url = new URL(window.location);
    url.searchParams.delete('photo');
    window.history.pushState({}, '', url);
}

// 设置事件监听器
function setupEventListeners() {
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') navigatePhoto(-1);
        if (e.key === 'ArrowRight') navigatePhoto(1);
    });
}

// 导航照片
function navigatePhoto(direction) {
    if (!modal.classList.contains('active')) return;

    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = photos.length - 1;
    if (currentPhotoIndex >= photos.length) currentPhotoIndex = 0;

    openModal(currentPhotoIndex);
}

// 显示提示
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 检查 URL 参数
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const photoParam = params.get('photo');

    if (!photoParam) return;

    const index = photos.findIndex(p => p.filename === photoParam);
    if (index !== -1) {
        openModal(index);
    } else {
        showToast('找不到指定的照片');
    }
}

// 监听浏览器前进后退
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const photoParam = params.get('photo');

    if (photoParam) {
        const index = photos.findIndex(p => p.filename === photoParam);
        if (index !== -1) {
            openModal(index);
        } else {
            closeModal();
        }
    } else {
        closeModal();
    }
});

// 更新图片变换
function updateImageTransform() {
    modalImage.style.transform = `scale(${zoomScale}) translate(${translateX / zoomScale}px, ${translateY / zoomScale}px)`;
    modalImage.style.cursor = 'grab';
}

// 计算两点距离
function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// 设置滚轮放大功能
function setupZoomFunctionality() {
    // 触摸缩放相关常量
    const DOUBLE_TAP_THRESHOLD = 300;
    const DOUBLE_TAP_DISTANCE_THRESHOLD = 30;
    let lastTouchTime = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    modalImage.addEventListener('wheel', (e) => {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomScale = Math.min(Math.max(0.5, zoomScale + delta), 3);

        updateImageTransform();
    });

    // 鼠标拖拽移动
    modalImage.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modalImage.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateImageTransform();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modalImage.style.cursor = 'grab';
        }
    });

    // 双击重置缩放
    modalImage.addEventListener('dblclick', () => {
        resetZoom();
    });

    // 阻止浏览器默认缩放行为（iOS Safari）
    modalImage.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    modalImage.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    });
    modalImage.addEventListener('gestureend', (e) => {
        e.preventDefault();
    });

    // 触摸事件 - 双指缩放和单指拖拽
    modalImage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            isDragging = false;
            initialPinchDistance = getPinchDistance(e.touches);
            initialScale = zoomScale;
            e.preventDefault();
            e.stopPropagation();
        } else if (e.touches.length === 1) {
            const currentTime = Date.now();
            const touch = e.touches[0];
            const touchX = touch.clientX;
            const touchY = touch.clientY;

            // 检测双击
            if (currentTime - lastTouchTime < DOUBLE_TAP_THRESHOLD &&
                Math.abs(touchX - lastTouchX) < DOUBLE_TAP_DISTANCE_THRESHOLD &&
                Math.abs(touchY - lastTouchY) < DOUBLE_TAP_DISTANCE_THRESHOLD) {
                if (zoomScale > 1) {
                    zoomScale = 1;
                    translateX = 0;
                    translateY = 0;
                } else {
                    zoomScale = 2;
                }
                updateImageTransform();
                e.preventDefault();
                lastTouchTime = 0;
                return;
            }

            isDragging = true;
            startX = touchX - translateX;
            startY = touchY - translateY;
            lastTouchTime = currentTime;
            lastTouchX = touchX;
            lastTouchY = touchY;
            e.preventDefault();
        }
    }, { passive: false });

    modalImage.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2) {
            const currentDistance = getPinchDistance(e.touches);
            const delta = currentDistance / initialPinchDistance;
            zoomScale = Math.min(Math.max(0.5, initialScale * delta), 3);
            updateImageTransform();
            e.preventDefault();
            e.stopPropagation();
        } else if (isDragging && e.touches.length === 1) {
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateImageTransform();
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });

    modalImage.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            isPinching = false;
            initialPinchDistance = null;
        }
        if (e.touches.length === 0) {
            isDragging = false;
        }
    });

    modalImage.addEventListener('touchcancel', () => {
        isPinching = false;
        isDragging = false;
        initialPinchDistance = null;
    });
}
