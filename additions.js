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

// Border-radius options for smooth morphing - only rectangular shapes
const roundnessOptions = [
    '0rem',    // Sharp rectangle
    '10px',    // Slightly rounded corners
    '20px',    // Medium rounded corners
    '40px',    // More rounded corners
    '60px'     // Well rounded corners
];

// Morph each shape individually at random intervals
shapes.forEach((shape, index) => {
    let prevRoundness = 0;
    let isHovering = false;
    
    shape.addEventListener('mouseenter', () => {
        isHovering = true;
    });
    
    shape.addEventListener('mouseleave', () => {
        isHovering = false;
    });
    
    // Morph when animation completes a cycle (edge collision)
    shape.addEventListener('animationiteration', () => {
        if (!isHovering) {
            const roundnessIndex = uniqueRand(0, roundnessOptions.length - 1, prevRoundness);
            const borderRadius = roundnessOptions[roundnessIndex];
            shape.style.borderRadius = borderRadius;
            prevRoundness = roundnessIndex;
        }
    });
    
    const morphShape = () => {
        if (isHovering) {
            setTimeout(morphShape, 100);
            return;
        }
        
        const roundnessIndex = uniqueRand(0, roundnessOptions.length - 1, prevRoundness);
        const borderRadius = roundnessOptions[roundnessIndex];
        shape.style.borderRadius = borderRadius;
        prevRoundness = roundnessIndex;
        
        // Morph every 3 seconds as backup
        setTimeout(morphShape, 3000);
    };
    
    // Start each shape's morphing with a staggered delay
    setTimeout(() => morphShape(), index * 400);
});