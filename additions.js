const mousetrailer = document.getElementById("mousetrailer");

window.onmousemove = e => {
    const x = e.clientX - mousetrailer.offsetWidth / 2;
    const y = e.clientY - mousetrailer.offsetHeight / 2;

    const keyframes = {
        transform: `translate(${x}px, ${y}px)`
    }
    mousetrailer.animate(keyframes, {
        duration: 400,
        fill: 'forwards'
    });
}

const shapes = document.querySelectorAll('.nav-shape');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const uniqueRand = (min, max, prev) => {
    let next = prev;
    while (prev === next) next = rand(min, max);
    return next;
}

// Border-radius options for morphing on edge collision
const roundnessOptions = ['0rem', '10px', '20px', '40px', '60px'];

// Get responsive shape size (1/5th of smaller viewport dimension)
const getShapeSize = () => Math.min(window.innerWidth, window.innerHeight) / 4;

// DVD-style bouncing physics
const shapeData = [];
const baseSpeed = 2;

shapes.forEach((shape, index) => {
    const size = getShapeSize();
    
    // Random starting position
    const x = rand(0, window.innerWidth - size);
    const y = rand(0, window.innerHeight - size);
    
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
    
    // Set initial size and position
    shape.style.width = size + 'px';
    shape.style.height = size + 'px';
    shape.style.left = x + 'px';
    shape.style.top = y + 'px';
    
    shape.addEventListener('mouseenter', () => {
        shapeData[index].isHovering = true;
    });
    
    shape.addEventListener('mouseleave', () => {
        shapeData[index].isHovering = false;
    });
});

// Update sizes on window resize
window.addEventListener('resize', () => {
    const size = getShapeSize();
    shapeData.forEach(data => {
        data.el.style.width = size + 'px';
        data.el.style.height = size + 'px';
        // Keep shapes in bounds after resize
        data.x = Math.min(data.x, window.innerWidth - size);
        data.y = Math.min(data.y, window.innerHeight - size);
    });
});

function animate() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = getShapeSize();
    
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

// Page transition handling
const pageTransition = document.getElementById('page-transition');
const transitionBars = document.querySelectorAll('.transition-bar');

// Color mapping for each page
const pageColors = {
    'about': '#D60270',
    'projects': '#9B4F96', 
    'experience': '#0038A8',
    'misc': '#069494'
};

shapes.forEach((shape, index) => {
    shape.addEventListener('click', (e) => {
        e.preventDefault();
        
        const page = shape.dataset.page;
        const color = pageColors[page] || '#000000';
        
        // Set bar colors to match clicked shape
        transitionBars.forEach(bar => {
            bar.style.background = color;
        });
        
        // Trigger transition
        pageTransition.classList.add('active');
        
        // Navigate after transition completes
        setTimeout(() => {
            window.location.href = `${page}.html`;
        }, 600);
    });
});