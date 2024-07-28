// ASCII characters for rendering (darker to brighter)
const ASCII_CHARS = ['@', '%', '#', '*', '+', '=', '-', ':', '.', ' '];

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Create a computer monitor
function createMonitor() {
    const group = new THREE.Group();

    // Monitor screen
    const screenGeometry = new THREE.BoxGeometry(4, 3, 0.1);
    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    group.add(screen);

    // Monitor frame
    const frameGeometry = new THREE.BoxGeometry(4.2, 3.2, 0.2);
    const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = -0.05;
    group.add(frame);

    // Monitor stand
    const standGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const standMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = -2.35;
    stand.position.z = 0.15;
    group.add(stand);

    return group;
}

const monitor = createMonitor();
scene.add(monitor);

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

    // Subtle monitor movement
    monitor.rotation.y = Math.sin(Date.now() * 0.001) * 0.1;
    monitor.rotation.x = Math.cos(Date.now() * 0.001) * 0.05;

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
