const PHOTOS = [
    {
        src: 'photos/DSC00624.JPG',
        thumbnail: 'photos/thumbnails/DSC00624.jpg',
        title: 'DSC00624',
        date: '2025-05-16 17:55',
        location: '',
        camera: 'SONY ILCE-7CM2',
        lens: 'FE 50mm F1.4 GM',
        settings: 'f/5 | 1/200s | ISO 100 | 50mm',
    },
    {
        src: 'photos/DSC_1759.JPG',
        thumbnail: 'photos/thumbnails/DSC_1759.jpg',
        title: 'DSC_1759',
        date: '2026-04-11 19:16',
        location: '',
        camera: 'NIKON CORPORATION NIKON Z50_2',
        lens: 'Viltrox AF 56/1.7 Z',
        settings: 'f/1.7 | 1/400s | ISO 5000 | 56mm',
    },
];

const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const photoTitle = document.getElementById('photo-title');
const photoDate = document.getElementById('photo-date');
const photoLocation = document.getElementById('photo-location');
const photoCamera = document.getElementById('photo-camera');
const photoLens = document.getElementById('photo-lens');
const photoSettings = document.getElementById('photo-settings');
const loadingScreen = document.getElementById('loading-screen');

let photos = [];
let currentPhotoIndex = 0;

let zoomScale = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;
let initialPinchDistance = null;
let initialScale = 1;
let isPinching = false;

document.addEventListener('DOMContentLoaded', () => {
    loadingScreen.querySelector('.quote-text').textContent =
        ["摄影是光的艺术。", "一张照片胜过千言万语。", "最好的相机是你随身携带的那一台。",
         "摄影是发现生活中被忽视的美。", "通过镜头，我看到了不同的世界。", "每一张照片都是一个故事。",
         "摄影是捕捉时间的艺术。", "光是摄影的灵魂。", "摄影是观察的艺术，是在平凡中发现不平凡。",
         "相机是思想的工具，眼睛是灵魂的窗户。", "摄影是凝固时间的魔法。", "每一张照片都是对现实的重新诠释。",
         "摄影是记录生活的方式，也是表达情感的语言。", "通过摄影，我们可以看到世界的另一面。",
         "摄影是光与影的舞蹈。"][Math.floor(Math.random() * 15)];

    document.querySelector('.close-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') navigatePhoto(-1);
        if (e.key === 'ArrowRight') navigatePhoto(1);
    });

    setupZoomFunctionality();

    const t = Date.now();
    loadPhotos();
    openFromUrl();
    setTimeout(() => loadingScreen.classList.add('hidden'), Math.max(0, 500 - (Date.now() - t)));
});

function loadPhotos() {
    if (PHOTOS.length === 0) {
        gallery.innerHTML = '<div class="loading">暂无照片，请在 script.js 的 PHOTOS 数组中添加照片</div>';
        return;
    }

    photos = PHOTOS.map(p => ({
        src: p.src,
        thumbnail: p.thumbnail || p.src,
        title: p.title || p.src.split('/').pop().split('.')[0],
        date: p.date || null,
        location: p.location || null,
        camera: p.camera || null,
        lens: p.lens || null,
        settings: p.settings || null,
    }));

    gallery.innerHTML = '';
    photos.forEach((photo, index) => renderPhotoCard(photo, index));
}

function renderPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.style.animationDelay = `${Math.min(index * 30, 500)}ms`;

    const img = document.createElement('img');
    img.src = photo.thumbnail;
    img.alt = photo.title;
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    overlay.innerHTML = `<h3>${photo.title}</h3><div class="date">${photo.date || '-'}</div>`;

    card.append(img, overlay);
    card.addEventListener('click', () => openModal(index));
    gallery.appendChild(card);
}

function openModal(index) {
    currentPhotoIndex = index;
    const photo = photos[index];

    modalImage.src = photo.src;
    photoTitle.textContent = photo.title || photo.src.split('/').pop().split('.')[0];
    photoDate.textContent = photo.date || '-';
    photoLocation.textContent = photo.location || '-';
    photoCamera.textContent = photo.camera || '-';
    photoLens.textContent = photo.lens || '-';
    photoSettings.textContent = Array.isArray(photo.settings) ? photo.settings.join(' | ') : (photo.settings || '-');

    zoomScale = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    const url = new URL(window.location);
    url.searchParams.set('photo', String(index));
    window.history.pushState({}, '', url);
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    const url = new URL(window.location);
    url.searchParams.delete('photo');
    window.history.pushState({}, '', url);
}

function navigatePhoto(direction) {
    if (!modal.classList.contains('active')) return;
    currentPhotoIndex = (currentPhotoIndex + direction + photos.length) % photos.length;
    openModal(currentPhotoIndex);
}

function openFromUrl() {
    const param = new URLSearchParams(window.location.search).get('photo');
    if (param === null) return;
    const index = parseInt(param, 10);
    if (index >= 0 && index < photos.length) {
        openModal(index);
    } else {
        const toast = document.getElementById('toast');
        toast.textContent = '找不到指定的照片';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
}

window.addEventListener('popstate', () => {
    const param = new URLSearchParams(window.location.search).get('photo');
    if (param !== null) {
        const index = parseInt(param, 10);
        if (index >= 0 && index < photos.length) { openModal(index); return; }
    }
    closeModal();
});

function updateImageTransform() {
    modalImage.style.transform = `scale(${zoomScale}) translate(${translateX / zoomScale}px, ${translateY / zoomScale}px)`;
    modalImage.style.cursor = 'grab';
}

function setupZoomFunctionality() {
    const TAP_THRESHOLD = 300;
    const TAP_DIST = 30;
    let lastTime = 0, lastX = 0, lastY = 0;

    modalImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomScale = Math.min(Math.max(0.5, zoomScale * (e.deltaY > 0 ? 0.9 : 1.1)), 6);
        updateImageTransform();
    });

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
        if (isDragging) { isDragging = false; modalImage.style.cursor = 'grab'; }
    });

    modalImage.addEventListener('dblclick', () => {
        zoomScale = 1; translateX = 0; translateY = 0; updateImageTransform();
    });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt =>
        modalImage.addEventListener(evt, e => e.preventDefault()));

    modalImage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true; isDragging = false;
            initialPinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            initialScale = zoomScale;
            e.preventDefault(); e.stopPropagation();
        } else if (e.touches.length === 1) {
            const now = Date.now(), t = e.touches[0];
            if (now - lastTime < TAP_THRESHOLD && Math.abs(t.clientX - lastX) < TAP_DIST && Math.abs(t.clientY - lastY) < TAP_DIST) {
                zoomScale = zoomScale > 1 ? 1 : 2;
                if (zoomScale === 1) { translateX = 0; translateY = 0; }
                updateImageTransform(); e.preventDefault(); lastTime = 0; return;
            }
            isDragging = true;
            startX = t.clientX - translateX; startY = t.clientY - translateY;
            lastTime = now; lastX = t.clientX; lastY = t.clientY;
            e.preventDefault();
        }
    }, { passive: false });

    modalImage.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2) {
            zoomScale = Math.min(Math.max(0.5, initialScale * Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) / initialPinchDistance), 6);
            updateImageTransform(); e.preventDefault(); e.stopPropagation();
        } else if (isDragging && e.touches.length === 1) {
            translateX = e.touches[0].clientX - startX; translateY = e.touches[0].clientY - startY;
            updateImageTransform(); e.preventDefault(); e.stopPropagation();
        }
    }, { passive: false });

    modalImage.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) { isPinching = false; initialPinchDistance = null; }
        if (e.touches.length === 0) isDragging = false;
    });
    modalImage.addEventListener('touchcancel', () => { isPinching = false; isDragging = false; initialPinchDistance = null; });
}
