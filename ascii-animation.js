// ASCII characters for rendering (darker to brighter)
const ASCII_CHARS = ['@', '%', '#', '*', '+', '=', '-', ':', '.', ' '];

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);  // Append the renderer to the DOM

// Set the scene background color
scene.background = new THREE.Color(0x000033);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

// Create a computer monitor
function createMonitor() {
    const group = new THREE.Group();

    // Monitor screen
    const screenGeometry = new THREE.PlaneGeometry(2, 1.5);
    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    group.add(screen);

    // Monitor frame
    const frameGeometry = new THREE.BoxGeometry(2.1, 1.6, 0.1);
    const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xd3d3d3 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = -0.05;
    group.add(frame);

    // Monitor stand
    const standGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const standMaterial = new THREE.MeshBasicMaterial({ color: 0x4f4f4f });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = -1.2;
    stand.position.z = 0.1;
    group.add(stand);

    // Add some "screen content"
    const contentGeometry = new THREE.PlaneGeometry(1.9, 1.4);
    const contentTexture = new THREE.CanvasTexture(createScreenContent());
    const contentMaterial = new THREE.MeshBasicMaterial({ map: contentTexture, transparent: true });
    const content = new THREE.Mesh(contentGeometry, contentMaterial);
    content.position.z = 0.01;
    group.add(content);

    return group;
}

function createScreenContent() {
    const canvas = document.createElement('canvas');
    canvas.width = 190;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00FF00';
    ctx.font = '10px monospace';
    ctx.fillText('> KICKED DROID', 5, 15);
    ctx.fillText('> INITIALIZING...', 5, 30);
    ctx.fillText('> ACCESS GRANTED', 5, 45);
    
    return canvas;
}

const monitor = createMonitor();
scene.add(monitor);

camera.position.z = 3;

// Create a hidden canvas for image data extraction
const hiddenCanvas = document.createElement('canvas');
const hiddenContext = hiddenCanvas.getContext('2d');

// Check if the context was successfully created
if (!hiddenContext) {
    console.error('Failed to get 2D context for hidden canvas');
}

// Function to convert render to ASCII
function convertToAscii(width, height) {
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    
    // Check if the renderer is properly rendered before drawing
    if (renderer.domElement) {
        hiddenContext.drawImage(renderer.domElement, 0, 0);
        const imageData = hiddenContext.getImageData(0, 0, width, height);
        const data = imageData.data;

        let ascii = '';
        for (let i = 0; i < height; i += 1) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const char = ASCII_CHARS[Math.floor((brightness / 255) * (ASCII_CHARS.length - 1))];
                ascii += char || ' ';
            }
            ascii += '\n';
        }
        return ascii;
    } else {
        console.error('Renderer DOM element is not ready');
        return '';
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Subtle monitor movement
    monitor.rotation.y = Math.sin(Date.now() * 0.001) * 0.05;
    monitor.rotation.x = Math.cos(Date.now() * 0.001) * 0.025;

    renderer.render(scene, camera);

    const ascii = convertToAscii(80, 40);  // Adjust these values to change the ASCII resolution
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
