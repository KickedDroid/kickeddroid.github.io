// ASCII characters for rendering (darker to brighter)
const ASCII_CHARS = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Create a larger, more complex shape
const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const torusKnot = new THREE.Mesh(geometry, material);
scene.add(torusKnot);

// Add some rotating cubes around the torus knot
for (let i = 0; i < 5; i++) {
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(
        Math.cos(i / 5 * Math.PI * 2) * 15,
        Math.sin(i / 5 * Math.PI * 2) * 15,
        0
    );
    scene.add(cube);
}

camera.position.z = 30;

// Create a hidden canvas for image data extraction
const hiddenCanvas = document.createElement('canvas');
const hiddenContext = hiddenCanvas.getContext('2d', {willReadFrequently: true});

// Function to convert render to ASCII
function convertToAscii(width, height) {
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    
    hiddenContext.drawImage(renderer.domElement, 0, 0);
    const imageData = hiddenContext.getImageData(0, 0, width, height, true);
    const data = imageData.data;
    
    let ascii = '';
    for (let i = 0; i < height; i += 2) {
        for (let j = 0; j < width; j++) {
            const idx = (i * width + j) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const char = ASCII_CHARS[Math.floor((brightness / 255) * (ASCII_CHARS.length - 1))];
            ascii += char || ' ';
        }
        ascii += '\n';
    }
    return ascii;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    torusKnot.rotation.x += 0.01;
    torusKnot.rotation.y += 0.01;

    scene.children.forEach((child, index) => {
        if (child !== torusKnot) {
            child.rotation.x += 0.02;
            child.rotation.y += 0.02;
            child.position.x = Math.cos((Date.now() / 1000 + index) * Math.PI * 2 / 5) * 15;
            child.position.y = Math.sin((Date.now() / 1000 + index) * Math.PI * 2 / 5) * 15;
        }
    });

    renderer.render(scene, camera);

    const ascii = convertToAscii(window.innerWidth, window.innerHeight);
    document.getElementById('ascii-render').textContent = ascii;
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation
animate();
