import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class MazeGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.playerBox = new THREE.Box3();
        
        // Maze properties
        this.mazeSize = 15;
        this.cellSize = 2;
        this.wallHeight = 3;
        this.maze = [];
        this.walls = [];
        this.endPosition = null;
        this.torches = [];
        this.particles = null;
        this.coins = [];
        this.coinsCollected = 0;
        this.totalCoins = 0;
        this.gameWon = false;
        
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x1a1a2e);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(1, 1.6, 1);
        this.camera.lookAt(0, 1.6, 0);

        // Setup lighting
        this.setupLighting();

        // Generate and render maze
        this.generateMaze();
        this.renderMaze();

        // Setup controls
        this.setupControls();

        // Setup event listeners
        this.setupEventListeners();

        // Restart button
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.restart();
                // relock pointer after restart for seamless play
                this.renderer.domElement.requestPointerLock();
            });
        }

        // Start animation loop
        this.animate();
    }

    setupLighting() {
        // Ambient light - increased brightness
        const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
        this.scene.add(ambientLight);

        // Directional light (sun) - increased brightness
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(20, 30, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        this.scene.add(directionalLight);

        // Additional fill light for better visibility
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-20, 20, -20);
        this.scene.add(fillLight);

        // Point light at exit
        const pointLight = new THREE.PointLight(0x4CAF50, 1.5, 50);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }

    createTorch(x, z) {
        const torchGroup = new THREE.Group();

        // Torch pole
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 0.75;
        pole.castShadow = true;
        torchGroup.add(pole);

        // Torch flame
        const flameGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const flameMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF6600,
            emissive: 0xFF6600,
            emissiveIntensity: 1
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = 1.6;
        torchGroup.add(flame);

        // Torch light
        const torchLight = new THREE.PointLight(0xFF6600, 0.8, 10);
        torchLight.position.set(0, 1.6, 0);
        torchLight.castShadow = true;
        torchGroup.add(torchLight);

        torchGroup.position.set(x, 0, z);
        this.scene.add(torchGroup);
        this.torches.push({ group: torchGroup, flame: flame, light: torchLight });
    }

    createPillar(x, z) {
        const pillarGroup = new THREE.Group();

        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x5a5a7a });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.1;
        base.castShadow = true;
        pillarGroup.add(base);

        // Pillar shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 16);
        const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x6a6a8a });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.y = 1.35;
        shaft.castShadow = true;
        pillarGroup.add(shaft);

        // Capital (top)
        const capitalGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.3, 16);
        const capitalMaterial = new THREE.MeshStandardMaterial({ color: 0x7a7a9a });
        const capital = new THREE.Mesh(capitalGeometry, capitalMaterial);
        capital.position.y = 2.65;
        capital.castShadow = true;
        pillarGroup.add(capital);

        pillarGroup.position.set(x, 0, z);
        this.scene.add(pillarGroup);
        return pillarGroup;
    }

    createExitStructure() {
        const exitGroup = new THREE.Group();

        // Base platform
        const platformGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16);
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a2d,
            emissive: 0x1a3a1a,
            emissiveIntensity: 0.3
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = 0.1;
        platform.castShadow = true;
        platform.receiveShadow = true;
        exitGroup.add(platform);

        // Central pillar
        const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 16);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            emissive: 0x4CAF50,
            emissiveIntensity: 0.5
        });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.y = 1.1;
        pillar.castShadow = true;
        exitGroup.add(pillar);

        // Glowing sphere on top
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            emissive: 0x4CAF50,
            emissiveIntensity: 1
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 2.2;
        sphere.castShadow = true;
        exitGroup.add(sphere);

        // Ring around sphere
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.05, 8, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x66FF66,
            emissive: 0x66FF66,
            emissiveIntensity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.y = 2.2;
        ring.rotation.x = Math.PI / 2;
        exitGroup.add(ring);

        exitGroup.position.copy(this.endPosition);
        this.scene.add(exitGroup);
        this.exitMarker = exitGroup;
        this.exitSphere = sphere;
        this.exitRing = ring;

        // Create particle system
        this.createParticles();
    }

    createParticles() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 4;
            positions[i + 1] = Math.random() * 3;
            positions[i + 2] = (Math.random() - 0.5) * 4;

            colors[i] = 0.3 + Math.random() * 0.2; // Green
            colors[i + 1] = 0.8 + Math.random() * 0.2;
            colors[i + 2] = 0.4 + Math.random() * 0.2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.position.copy(this.endPosition);
        this.particles.position.y = 1;
        this.scene.add(this.particles);
    }

    generateMaze() {
        // Initialize maze grid (1 = wall, 0 = path)
        this.maze = Array(this.mazeSize).fill(null).map(() => Array(this.mazeSize).fill(1));
        
        // Start from top-left corner
        const stack = [];
        const startX = 1;
        const startY = 1;
        this.maze[startY][startX] = 0;
        stack.push([startX, startY]);

        // Recursive backtracking algorithm
        while (stack.length > 0) {
            const [x, y] = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(x, y);

            if (neighbors.length > 0) {
                const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
                // Remove wall between current and chosen neighbor
                this.maze[ny][nx] = 0;
                this.maze[(y + ny) / 2][(x + nx) / 2] = 0;
                stack.push([nx, ny]);
            } else {
                stack.pop();
            }
        }

        // Set exit at bottom-right
        const exitX = this.mazeSize - 2;
        const exitY = this.mazeSize - 2;
        this.maze[exitY][exitX] = 0;
        this.endPosition = new THREE.Vector3(
            (exitX - this.mazeSize / 2) * this.cellSize,
            0,
            (exitY - this.mazeSize / 2) * this.cellSize
        );
    }

    getUnvisitedNeighbors(x, y) {
        const neighbors = [];
        const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx > 0 && nx < this.mazeSize - 1 && ny > 0 && ny < this.mazeSize - 1 && this.maze[ny][nx] === 1) {
                neighbors.push([nx, ny]);
            }
        }

        return neighbors;
    }

    renderMaze() {
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(
            this.mazeSize * this.cellSize,
            this.mazeSize * this.cellSize
        );
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d2d44,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Create walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a6a,
            roughness: 0.7,
            metalness: 0.1
        });

        for (let y = 0; y < this.mazeSize; y++) {
            for (let x = 0; x < this.mazeSize; x++) {
                if (this.maze[y][x] === 1) {
                    const wallGeometry = new THREE.BoxGeometry(
                        this.cellSize * 0.9,
                        this.wallHeight,
                        this.cellSize * 0.9
                    );
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(
                        (x - this.mazeSize / 2) * this.cellSize,
                        this.wallHeight / 2,
                        (y - this.mazeSize / 2) * this.cellSize
                    );
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.walls.push(wall);
                }
            }
        }

        // Create exit structure
        this.createExitStructure();

        // Add torches at strategic locations
        this.addTorches();

        // Add decorative pillars
        this.addPillars();

        // Add collectible coins
        this.addCoins();
    }

    createCoin(x, z) {
        const coinGroup = new THREE.Group();

        // Coin body (cylinder)
        const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);
        const coinMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.2
        });
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        coin.rotation.x = Math.PI / 2;
        coin.castShadow = true;
        coinGroup.add(coin);

        // Coin glow
        const glowGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.02, 32);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = Math.PI / 2;
        coinGroup.add(glow);

        // Point light for coin
        const coinLight = new THREE.PointLight(0xFFD700, 0.5, 5);
        coinLight.position.set(0, 0.5, 0);
        coinGroup.add(coinLight);

        coinGroup.position.set(x, 1.2, z);
        this.scene.add(coinGroup);
        
        const coinData = {
            group: coinGroup,
            coin: coin,
            glow: glow,
            light: coinLight,
            collected: false
        };
        this.coins.push(coinData);
        return coinData;
    }

    addCoins() {
        // Find open spaces for coins
        const coinPositions = [];
        for (let y = 1; y < this.mazeSize - 1; y++) {
            for (let x = 1; x < this.mazeSize - 1; x++) {
                if (this.maze[y][x] === 0) {
                    // Don't place coins at start or exit
                    const worldX = (x - this.mazeSize / 2) * this.cellSize;
                    const worldZ = (y - this.mazeSize / 2) * this.cellSize;
                    const startX = (1 - this.mazeSize / 2) * this.cellSize;
                    const startZ = (1 - this.mazeSize / 2) * this.cellSize;
                    const exitX = (this.mazeSize - 2 - this.mazeSize / 2) * this.cellSize;
                    const exitZ = (this.mazeSize - 2 - this.mazeSize / 2) * this.cellSize;
                    
                    const distToStart = Math.sqrt((worldX - startX) ** 2 + (worldZ - startZ) ** 2);
                    const distToExit = Math.sqrt((worldX - exitX) ** 2 + (worldZ - exitZ) ** 2);
                    
                    if (distToStart > 3 && distToExit > 3) {
                        coinPositions.push([worldX, worldZ]);
                    }
                }
            }
        }

        // Place coins (about 15-20 coins)
        this.totalCoins = Math.min(20, Math.floor(coinPositions.length * 0.3));
        for (let i = 0; i < this.totalCoins; i++) {
            if (coinPositions.length === 0) break;
            const idx = Math.floor(Math.random() * coinPositions.length);
            const [x, z] = coinPositions.splice(idx, 1)[0];
            this.createCoin(x, z);
        }
        
        this.updateCoinUI();
    }

    checkCoinCollection() {
        const playerPos = this.controls.getObject().position;
        
        for (const coinData of this.coins) {
            if (coinData.collected) continue;
            
            const coinPos = coinData.group.position;
            const distance = playerPos.distanceTo(coinPos);
            
            if (distance < 0.8) {
                coinData.collected = true;
                this.coinsCollected++;
                this.scene.remove(coinData.group);
                this.updateCoinUI();
                
                // Visual feedback
                console.log(`Coin collected! (${this.coinsCollected}/${this.totalCoins})`);
            }
        }
    }

    updateCoinUI() {
        const coinText = document.getElementById('coinCount');
        if (coinText) {
            coinText.textContent = `Coins: ${this.coinsCollected}/${this.totalCoins}`;
        }
    }

    addTorches() {
        // Add torches at some wall corners
        const torchPositions = [];
        for (let y = 2; y < this.mazeSize - 2; y += 3) {
            for (let x = 2; x < this.mazeSize - 2; x += 3) {
                if (this.maze[y][x] === 0) {
                    const worldX = (x - this.mazeSize / 2) * this.cellSize;
                    const worldZ = (y - this.mazeSize / 2) * this.cellSize;
                    torchPositions.push([worldX, worldZ]);
                }
            }
        }

        // Limit number of torches
        const numTorches = Math.min(8, torchPositions.length);
        for (let i = 0; i < numTorches; i++) {
            const idx = Math.floor(Math.random() * torchPositions.length);
            const [x, z] = torchPositions.splice(idx, 1)[0];
            this.createTorch(x, z);
        }
    }

    addPillars() {
        // Add pillars at some intersections
        const pillarPositions = [];
        for (let y = 3; y < this.mazeSize - 3; y += 4) {
            for (let x = 3; x < this.mazeSize - 3; x += 4) {
                if (this.maze[y][x] === 0) {
                    const worldX = (x - this.mazeSize / 2) * this.cellSize;
                    const worldZ = (y - this.mazeSize / 2) * this.cellSize;
                    pillarPositions.push([worldX, worldZ]);
                }
            }
        }

        // Limit number of pillars
        const numPillars = Math.min(5, pillarPositions.length);
        for (let i = 0; i < numPillars; i++) {
            const idx = Math.floor(Math.random() * pillarPositions.length);
            const [x, z] = pillarPositions.splice(idx, 1)[0];
            this.createPillar(x, z);
        }
    }

    setupControls() {
        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.scene.add(this.controls.getObject());
    }

    setupEventListeners() {
        // Pointer lock
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.renderer.domElement) {
                this.controls.enabled = true;
            } else {
                this.controls.enabled = false;
            }
        });

        // Keyboard controls
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'KeyW': this.moveForward = true; break;
                case 'KeyS': this.moveBackward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyD': this.moveRight = true; break;
                case 'Space': if (this.canJump) this.velocity.y += 220; break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'KeyW': this.moveForward = false; break;
                case 'KeyS': this.moveBackward = false; break;
                case 'KeyA': this.moveLeft = false; break;
                case 'KeyD': this.moveRight = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    checkCollision(newPosition) {
        const playerRadius = 0.4;
        const playerHeight = 1.6;
        
        // Create player bounding box
        const playerBox = new THREE.Box3(
            new THREE.Vector3(
                newPosition.x - playerRadius,
                newPosition.y,
                newPosition.z - playerRadius
            ),
            new THREE.Vector3(
                newPosition.x + playerRadius,
                newPosition.y + playerHeight,
                newPosition.z + playerRadius
            )
        );
        
        // Check collision with walls
        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            if (wallBox.intersectsBox(playerBox)) {
                return true;
            }
        }
        
        return false;
    }

    checkCollisionXZ(newX, newZ, currentY) {
        const playerRadius = 0.4;
        const playerHeight = 1.6;
        
        const testPos = new THREE.Vector3(newX, currentY, newZ);
        return this.checkCollision(testPos);
    }

    checkWin() {
        const playerPos = this.controls.getObject().position;
        const distance = playerPos.distanceTo(this.endPosition);
        
        if (distance < 1.5 && !this.gameWon) {
            this.gameWon = true;
            const winMessage = document.getElementById('winMessage');
            const winText = document.getElementById('winText');
            const winCoins = document.getElementById('winCoins');
            if (winText) {
                winText.innerHTML = 'You found the exit!';
            }
            if (winCoins) {
                winCoins.textContent = `Coins: ${this.coinsCollected}/${this.totalCoins}`;
            }
            if (winMessage) {
                winMessage.classList.add('show');
            }
            this.controls.enabled = false;
            document.exitPointerLock();
            return true;
        }
        return false;
    }

    restart() {
        this.gameWon = false;
        this.coinsCollected = 0;
        this.velocity.set(0, 0, 0);
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;

        const controlsObject = this.controls.getObject();

        const toRemove = [];
        this.scene.children.forEach(child => {
            if (child !== controlsObject && child !== this.camera) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => this.scene.remove(child));

        this.walls = [];
        this.torches = [];
        this.coins = [];
        this.particles = null;
        this.exitMarker = null;
        this.exitSphere = null;
        this.exitRing = null;

        const winMessage = document.getElementById('winMessage');
        if (winMessage) {
            winMessage.classList.remove('show');
        }

        this.setupLighting();
        this.generateMaze();
        this.renderMaze();

        controlsObject.position.set(1, 1.6, 1);
        controlsObject.rotation.set(0, 0, 0);
        this.camera.position.set(1, 1.6, 1);
        this.camera.rotation.set(0, 0, 0);
        this.controls.enabled = true;

        this.updateCoinUI();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls.isLocked) {
            const delta = 0.016; 

            this.velocity.y -= 9.8 * 60.0 * delta;

            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * 400.0 * delta;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * 400.0 * delta;
            }

            const currentPos = this.controls.getObject().position.clone();
            
            if (Math.abs(this.velocity.x) > 0.01) {
                this.controls.moveRight(-this.velocity.x * delta);
                const newXPos = this.controls.getObject().position;
                if (this.checkCollisionXZ(newXPos.x, newXPos.z, newXPos.y)) {
                    this.controls.getObject().position.x = currentPos.x;
                    this.velocity.x = 0;
                }
            }

            if (Math.abs(this.velocity.z) > 0.01) {
                this.controls.moveForward(-this.velocity.z * delta);
                const newZPos = this.controls.getObject().position;
                if (this.checkCollisionXZ(newZPos.x, newZPos.z, newZPos.y)) {
                    this.controls.getObject().position.z = currentPos.z;
                    this.velocity.z = 0;
                }
            }

            const newPos = this.controls.getObject().position.clone();
            newPos.y += this.velocity.y * delta;
            
            if (this.checkCollision(newPos)) {
                newPos.y = currentPos.y;
                this.velocity.y = 0;
            }
            
            this.controls.getObject().position.y = newPos.y;

            if (this.controls.getObject().position.y < 1.6) {
                this.velocity.y = 0;
                this.controls.getObject().position.y = 1.6;
                this.canJump = true;
            } else {
                this.canJump = false;
            }

            this.checkCoinCollection();

            this.checkWin();
        }

        if (this.exitMarker) {
            const time = Date.now() * 0.003;
            if (this.exitSphere) {
                this.exitSphere.position.y = 2.2 + Math.sin(time) * 0.2;
                this.exitSphere.rotation.y += 0.02;
            }
            if (this.exitRing) {
                this.exitRing.rotation.z += 0.01;
            }
        }

        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            const time = Date.now() * 0.001;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += Math.sin(time + i) * 0.01;
                if (positions[i] > 3) positions[i] = 0;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += 0.002;
        }

        for (const torch of this.torches) {
            if (torch.flame) {
                torch.flame.scale.y = 1 + Math.sin(Date.now() * 0.01) * 0.3;
                torch.flame.rotation.z = Math.sin(Date.now() * 0.005) * 0.1;
            }
            if (torch.light) {
                torch.light.intensity = 0.6 + Math.sin(Date.now() * 0.01) * 0.2;
            }
        }

        for (const coinData of this.coins) {
            if (!coinData.collected && coinData.group) {
                coinData.group.rotation.y += 0.02;
                coinData.coin.position.y = Math.sin(Date.now() * 0.005 + coinData.group.position.x) * 0.1;
                if (coinData.light) {
                    coinData.light.intensity = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

new MazeGame();
