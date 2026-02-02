// Disable bfcache - forces fresh load on back/forward
window.addEventListener('unload', () => {});

// Get transition data from sessionStorage
const color = sessionStorage.getItem('transitionColor') || '#000000';
const storedX = sessionStorage.getItem('transitionX');
const storedY = sessionStorage.getItem('transitionY');

// Get responsive shape size (matches CSS clamp)
const getShapeSize = () => {
    const vwSize = window.innerWidth * 0.25;
    return Math.min(225, Math.max(120, vwSize));
}

// Position for overlay
const size = getShapeSize();
const halfSize = size / 2;
const centerX = storedX ? parseFloat(storedX) : window.innerWidth / 2;
const centerY = storedY ? parseFloat(storedY) : window.innerHeight / 2;

// Create overlay element
function createOverlay(startScaled) {
    const currentSize = getShapeSize();
    const overlay = document.createElement('div');
    overlay.id = 'shape-transition';
    overlay.style.backgroundColor = color;
    overlay.style.width = currentSize + 'px';
    overlay.style.height = currentSize + 'px';
    overlay.style.left = (centerX - currentSize / 2) + 'px';
    overlay.style.top = (centerY - currentSize / 2) + 'px';
    if (!startScaled) {
        overlay.style.transform = 'scale(1)';
    }
    document.body.appendChild(overlay);
    return overlay;
}

// Entry transition - shrink overlay to reveal page
const entryOverlay = createOverlay(true);
window.addEventListener('DOMContentLoaded', () => {
    // Push history state for back button interception
    history.pushState({ page: 'subpage' }, '');
    
    setTimeout(() => {
        entryOverlay.classList.add('shrink');
        setTimeout(() => {
            entryOverlay.remove();
        }, 500);
    }, 50);
});

// Exit transition - store info and navigate (index.html handles the shrink animation)
function doExitTransition() {
    // Mark that we're returning from a subpage
    sessionStorage.setItem('returningFromSubpage', 'true');
    window.location.href = 'index.html';
}

// Back button click handler
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.back-btn').addEventListener('click', (e) => {
        e.preventDefault();
        doExitTransition();
    });
});

// Browser back button handler
window.addEventListener('popstate', (e) => {
    doExitTransition();
});

// Mousetrailer
document.addEventListener('DOMContentLoaded', () => {
    const mousetrailer = document.getElementById("mousetrailer");
    
    window.onmousemove = e => {
        const x = e.clientX - mousetrailer.offsetWidth / 2;
        const y = e.clientY - mousetrailer.offsetHeight / 2;

        mousetrailer.animate({
            transform: `translate(${x}px, ${y}px)`
        }, {
            duration: 400,
            fill: 'forwards'
        });
    }
});