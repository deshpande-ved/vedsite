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