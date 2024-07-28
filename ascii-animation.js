// ASCII characters for rendering
const ASCII_CHARS = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Create a cube and add it to the scene
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// Create a hidden canvas for image data extraction
const hiddenCanvas = document.createElement('canvas');
const hiddenContext = hiddenCanvas.getContext('2d');

// Function to convert render to ASCII
function convertToAscii(width, height) {
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    
    hiddenContext.drawImage(renderer.domElement, 0, 0);
    const imageData = hiddenContext.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    let ascii = '';
    for (let i = 0; i < height; i += 2) {
        for (let j = 0; j < width; j++) {
            const idx = (i * width + j) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const char = ASCII_CHARS[Math.floor(brightness / 25)] || ' ';
            ascii += char;
        }
        ascii += '\n';
    }
    return ascii;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

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
