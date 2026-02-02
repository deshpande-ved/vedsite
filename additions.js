// Mousetrailer
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

// Shape bouncing and morphing
const shapes = document.querySelectorAll('.nav-shape');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const uniqueRand = (min, max, prev) => {
    let next = prev;
    while (prev === next) next = rand(min, max);
    return next;
}

// Border-radius options for morphing on edge collision
const roundnessOptions = ['0rem', '10px', '20px', '40px', '60px'];

// DVD-style bouncing physics
const shapeData = [];
const baseSpeed = 2;

shapes.forEach((shape, index) => {
    // Random starting position
    const x = rand(0, window.innerWidth - 225);
    const y = rand(0, window.innerHeight - 225);
    
    // Random direction with consistent speed
    const angle = Math.random() * 2 * Math.PI;
    const speed = baseSpeed + Math.random() * 0.5;
    
    shapeData.push({
        el: shape,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 2,
        prevRoundness: 0,
        isHovering: false
    });
    
    // Set initial position
    shape.style.left = x + 'px';
    shape.style.top = y + 'px';
    
    shape.addEventListener('mouseenter', () => {
        shapeData[index].isHovering = true;
    });
    
    shape.addEventListener('mouseleave', () => {
        shapeData[index].isHovering = false;
    });
});

function animate() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = 225;
    
    shapeData.forEach(data => {
        if (data.isHovering) {
            return; // Skip this shape, continue to next
        }
        
        // Update position
        data.x += data.vx;
        data.y += data.vy;
        
        // Update rotation
        data.rotation += data.rotationSpeed;
        
        let hitEdge = false;
        
        // Bounce off edges (DVD style - reverse velocity component)
        if (data.x <= 0) {
            data.x = 0;
            data.vx *= -1;
            hitEdge = true;
        } else if (data.x >= w - size) {
            data.x = w - size;
            data.vx *= -1;
            hitEdge = true;
        }
        
        if (data.y <= 0) {
            data.y = 0;
            data.vy *= -1;
            hitEdge = true;
        } else if (data.y >= h - size) {
            data.y = h - size;
            data.vy *= -1;
            hitEdge = true;
        }
        
        // Morph shape on edge collision
        if (hitEdge) {
            const roundnessIndex = uniqueRand(0, roundnessOptions.length - 1, data.prevRoundness);
            data.el.style.borderRadius = roundnessOptions[roundnessIndex];
            data.prevRoundness = roundnessIndex;
        }
        
        // Apply position and rotation
        data.el.style.left = data.x + 'px';
        data.el.style.top = data.y + 'px';
        data.el.style.transform = `rotate(${data.rotation}deg)`;
        
        // Counter-rotate the label to keep it readable
        const label = data.el.querySelector('.shape-label');
        if (label) {
            label.style.transform = `rotate(${-data.rotation}deg)`;
        }
    });
    
    requestAnimationFrame(animate);
}

animate();

// Page color mapping
const pageColors = {
    'about': '#D60270',
    'projects': '#9B4F96', 
    'experience': '#0038A8',
    'misc': '#069494'
};

// Check if returning from subpage - show shrinking overlay at shape's current position
const returningFromSubpage = sessionStorage.getItem('returningFromSubpage');
if (returningFromSubpage) {
    sessionStorage.removeItem('returningFromSubpage');
    
    const color = sessionStorage.getItem('transitionColor') || '#000000';
    
    // Find which shape matches this color
    let targetShapeData = null;
    for (const page in pageColors) {
        if (pageColors[page] === color) {
            const shapeEl = document.querySelector(`[data-page="${page}"]`);
            if (shapeEl) {
                const index = Array.from(shapes).indexOf(shapeEl);
                if (index !== -1) {
                    targetShapeData = shapeData[index];
                }
            }
            break;
        }
    }
    
    // Get current position of target shape (or fallback to center)
    const currentX = targetShapeData ? targetShapeData.x + 112.5 : window.innerWidth / 2;
    const currentY = targetShapeData ? targetShapeData.y + 112.5 : window.innerHeight / 2;
    
    // Create full-screen overlay at shape's current position
    const returnOverlay = document.createElement('div');
    returnOverlay.id = 'return-transition';
    returnOverlay.style.cssText = `
        position: fixed;
        width: 225px;
        height: 225px;
        background-color: ${color};
        border-radius: 0;
        z-index: 9999;
        pointer-events: none;
        left: ${currentX - 112.5}px;
        top: ${currentY - 112.5}px;
        transform: scale(20);
        transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 400ms ease, left 400ms ease, top 400ms ease;
    `;
    document.body.appendChild(returnOverlay);
    
    // Animate shrink to shape's live position
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Get updated position
            const liveX = targetShapeData ? targetShapeData.x : currentX - 112.5;
            const liveY = targetShapeData ? targetShapeData.y : currentY - 112.5;
            
            returnOverlay.style.left = liveX + 'px';
            returnOverlay.style.top = liveY + 'px';
            returnOverlay.style.transform = 'scale(1)';
            returnOverlay.style.borderRadius = '6rem';
            
            setTimeout(() => {
                returnOverlay.style.opacity = '0';
                returnOverlay.style.transition = 'opacity 200ms ease';
                setTimeout(() => returnOverlay.remove(), 200);
            }, 400);
        });
    });
}

// Page transition: expanding shape fills screen
shapes.forEach((shape, index) => {
    shape.addEventListener('click', (e) => {
        e.preventDefault();
        
        const page = shape.dataset.page;
        const rect = shape.getBoundingClientRect();
        
        // Store shape info for back transition
        sessionStorage.setItem('transitionColor', pageColors[page]);
        sessionStorage.setItem('transitionX', rect.left + rect.width / 2);
        sessionStorage.setItem('transitionY', rect.top + rect.height / 2);
        
        // Hide label during expansion
        const label = shape.querySelector('.shape-label');
        if (label) label.style.opacity = '0';
        
        // Calculate scale needed to cover viewport
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDistX = Math.max(centerX, window.innerWidth - centerX);
        const maxDistY = Math.max(centerY, window.innerHeight - centerY);
        const maxDist = Math.sqrt(maxDistX * maxDistX + maxDistY * maxDistY);
        const scale = (maxDist * 2) / rect.width * 1.5;
        
        // Add expanding class and apply transform
        shape.classList.add('expanding');
        shape.style.transform = `rotate(0deg) scale(${scale})`;
        
        // Navigate after transition completes
        setTimeout(() => {
            window.location.href = `${page}.html`;
        }, 700);
    });
});