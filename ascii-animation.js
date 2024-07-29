// ASCII characters for rendering
const ASCII_CHARS = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a cube and add it to the scene
const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

renderer.setClearColor(0x000000, 1);
camera.position.z = 7;

// Create a hidden canvas for image data extraction
const hiddenCanvas = document.createElement('canvas');
const hiddenContext = hiddenCanvas.getContext('2d', {willReadFrequently: true});

// Create a visible canvas for ASCII rendering
const asciiCanvas = document.createElement('canvas');
const asciiContext = asciiCanvas.getContext('2d');
document.body.appendChild(asciiCanvas);

// ASCII rendering settings
const ASCII_WIDTH = 100;
const ASCII_HEIGHT = 50;
const ASCII_FONT_SIZE = 10;
asciiCanvas.width = ASCII_WIDTH * ASCII_FONT_SIZE;
asciiCanvas.height = ASCII_HEIGHT * ASCII_FONT_SIZE;
asciiContext.font = `${ASCII_FONT_SIZE}px monospace`;
asciiContext.fillStyle = 'white';

// Function to convert render to ASCII
function convertToAscii() {
    hiddenCanvas.width = ASCII_WIDTH;
    hiddenCanvas.height = ASCII_HEIGHT;
    hiddenContext.drawImage(renderer.domElement, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
    const imageData = hiddenContext.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
    const data = imageData.data;

    asciiContext.clearRect(0, 0, asciiCanvas.width, asciiCanvas.height);

    for (let i = 0; i < ASCII_HEIGHT; i++) {
        for (let j = 0; j < ASCII_WIDTH; j++) {
            const idx = (i * ASCII_WIDTH + j) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
            const char = ASCII_CHARS[charIndex];
            asciiContext.fillText(char, j * ASCII_FONT_SIZE, (i + 1) * ASCII_FONT_SIZE);
        }
    }
}

// Animation loop
let lastAsciiUpdate = 0;
const ASCII_UPDATE_INTERVAL = 100; // Update ASCII every 100ms

function animate(time) {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);

    if (time - lastAsciiUpdate > ASCII_UPDATE_INTERVAL) {
        convertToAscii();
        lastAsciiUpdate = time;
    }
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation
animate();
