# 3D Maze Game

A fully-featured 3D maze game built with Three.js. Navigate through a procedurally generated maze to find the exit!

## Features

- **Procedurally Generated 3D Maze**: Each game creates a unique maze using a recursive backtracking algorithm
- **First-Person Controls**: Smooth WASD movement with mouse look
- **3D Models & Visuals**:
  - Animated torches with flickering flames
  - Decorative pillars
  - Elaborate exit structure with glowing effects
  - Particle system at the exit
  - Dynamic lighting and shadows
- **Collision Detection**: Realistic wall collisions
- **Win Condition**: Reach the glowing green exit to win!

## How to Run

Due to browser CORS restrictions, you need to run a local web server. Choose one of these options:

### Option 1: Python Server (Recommended)
1. Make sure Python is installed
2. Run `python server.py` or double-click `server.bat`
3. The game will open automatically in your browser

### Option 2: Node.js Server
1. Make sure Node.js is installed
2. Run `node server.js`
3. Open `http://localhost:8000/index.html` in your browser

### Option 3: VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` and select "Open with Live Server"

### Option 4: Other Options
- Use `npx http-server` (if you have Node.js)
- Use any other local web server tool

## How to Play

1. Start the local server using one of the options above
2. Click anywhere on the screen to lock your mouse pointer
3. Use **WASD** keys to move:
   - **W** - Move forward
   - **S** - Move backward
   - **A** - Move left
   - **D** - Move right
4. Use your **mouse** to look around
5. Press **Space** to jump
6. Find the glowing green exit structure to win!

## Technical Details

- Built with Three.js (loaded via CDN)
- Uses Pointer Lock API for first-person controls
- Procedural maze generation using recursive backtracking
- Box-based collision detection
- Real-time particle effects and animations

## Browser Compatibility

Works best in modern browsers that support:
- ES6 modules
- Pointer Lock API
- WebGL

## Customization

You can modify the game parameters in `game.js`:
- `mazeSize`: Change the maze dimensions (default: 15x15)
- `cellSize`: Adjust the size of each cell (default: 2)
- `wallHeight`: Change wall height (default: 3)

Enjoy exploring the maze!
