// Get responsive shape size (matches CSS clamp)
const getShapeSize = () => {
    const vwSize = window.innerWidth * 0.25;
    return Math.min(225, Math.max(120, vwSize));
}

// Get page color from body background
const getPageColor = () => {
    const rgb = getComputedStyle(document.body).backgroundColor;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2).toUpperCase();
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

// Get transition data from sessionStorage
const storedColor = sessionStorage.getItem('transitionColor') || '#000000';
const storedX = sessionStorage.getItem('transitionX');
const storedY = sessionStorage.getItem('transitionY');

// Position for overlay
const size = getShapeSize();
const halfSize = size / 2;
const centerX = storedX ? parseFloat(storedX) : window.innerWidth / 2;
const centerY = storedY ? parseFloat(storedY) : window.innerHeight / 2;

// Calculate radius to cover entire viewport from center point
const vpWidth = window.innerWidth;
const vpHeight = Math.max(window.innerHeight, document.documentElement.clientHeight, window.screen.height);
const maxDistX = Math.max(centerX + 50, vpWidth - centerX + 50);
const maxDistY = Math.max(centerY + 50, vpHeight - centerY + 50);
const fullRadius = Math.sqrt(maxDistX * maxDistX + maxDistY * maxDistY) + 100;

// Create entry overlay with clip-path (starts full, shrinks to circle)
const entryOverlay = document.createElement('div');
entryOverlay.id = 'shape-transition';
entryOverlay.style.cssText = `
    position: fixed;
    top: -50px;
    left: -50px;
    right: -50px;
    bottom: -50px;
    background-color: ${storedColor};
    z-index: 9999;
    pointer-events: none;
    clip-path: circle(${fullRadius}px at ${centerX + 50}px ${centerY + 50}px);
    transition: clip-path 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease;
`;
document.body.appendChild(entryOverlay);

// Entry transition - shrink overlay to reveal page
window.addEventListener('DOMContentLoaded', () => {
    // Push history state for back button interception
    history.pushState({ page: 'subpage' }, '');
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            entryOverlay.style.clipPath = `circle(${halfSize}px at ${centerX + 50}px ${centerY + 50}px)`;
            
            setTimeout(() => {
                entryOverlay.style.opacity = '0';
                setTimeout(() => entryOverlay.remove(), 200);
            }, 400);
        });
    });
});

// Exit transition - store current page color and navigate
function doExitTransition() {
    // Set current page's color for the return transition
    sessionStorage.setItem('transitionColor', getPageColor());
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

// Handle bfcache - clean up if page restored
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        // Remove any stuck overlays
        const overlay = document.getElementById('shape-transition');
        if (overlay) overlay.remove();
    }
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