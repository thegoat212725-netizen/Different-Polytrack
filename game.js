// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 600,
    CAR_WIDTH: 30,
    CAR_HEIGHT: 60,
    MAX_SPEED: 8,
    ACCELERATION: 0.2,
    BRAKING: 0.15,
    FRICTION: 0.98,
    TURNING_SPEED: 0.05,
    COLLISION_DAMPING: 0.7
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.keys = {};
        this.laps = 0;
        this.startTime = Date.now();
        this.lastLapTime = 0;
        this.bestLapTime = Infinity;
        this.lastLapZone = false;
        this.lapTimes = [];
        
        this.car = {
            x: 450,
            y: 450,
            angle: -Math.PI / 2,
            speed: 0,
            rotationSpeed: 0
        };
        
        this.track = {
            outer: { x: 100, y: 100, width: 700, height: 400 },
            inner: { x: 250, y: 200, width: 400, height: 200 },
            lapZone: { x: 430, y: 200, width: 40, height: 60 }
        };

        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') this.resetCar();
            if (e.key.toLowerCase() === 'r') location.reload();
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    resetCar() {
        this.car.x = 450;
        this.car.y = 450;
        this.car.angle = -Math.PI / 2;
        this.car.speed = 0;
        this.car.rotationSpeed = 0;
    }

    updateCar() {
        // Input handling
        if (this.keys['ArrowUp']) {
            this.car.speed = Math.min(this.car.speed + CONFIG.ACCELERATION, CONFIG.MAX_SPEED);
        }
        if (this.keys['ArrowDown']) {
            this.car.speed = Math.max(this.car.speed - CONFIG.BRAKING, -CONFIG.MAX_SPEED / 2);
        }
        if (this.keys['ArrowLeft']) {
            this.car.angle -= CONFIG.TURNING_SPEED * (this.car.speed / CONFIG.MAX_SPEED);
        }
        if (this.keys['ArrowRight']) {
            this.car.angle += CONFIG.TURNING_SPEED * (this.car.speed / CONFIG.MAX_SPEED);
        }

        // Apply friction
        this.car.speed *= CONFIG.FRICTION;

        // Update position
        this.car.x += Math.sin(this.car.angle) * this.car.speed;
        this.car.y -= Math.cos(this.car.angle) * this.car.speed;

        // Collision detection with track bounds
        this.handleCollisions();
    }

    handleCollisions() {
        const { x, y } = this.car;
        const { outer, inner } = this.track;

        // Check if car is off track (in grass or outside)
        const inOuter = x > outer.x && x < outer.x + outer.width && 
                        y > outer.y && y < outer.y + outer.height;
        const inInner = x > inner.x && x < inner.x + inner.width && 
                        y > inner.y && y < inner.y + inner.height;

        if (!inOuter || inInner) {
            // Car hit grass/wall - apply damping
            this.car.speed *= CONFIG.COLLISION_DAMPING;
            
            // Bounce car back
            this.car.x -= Math.sin(this.car.angle) * this.car.speed * 2;
            this.car.y += Math.cos(this.car.angle) * this.car.speed * 2;
        }

        // Keep car within canvas bounds
        this.car.x = Math.max(outer.x, Math.min(outer.x + outer.width, this.car.x));
        this.car.y = Math.max(outer.y, Math.min(outer.y + outer.height, this.car.y));
    }

    checkLap() {
        const { x, y } = this.car;
        const { lapZone } = this.track;
        
        const inLapZone = x > lapZone.x && x < lapZone.x + lapZone.width &&
                          y > lapZone.y && y < lapZone.y + lapZone.height;

        if (inLapZone && !this.lastLapZone) {
            const currentTime = (Date.now() - this.startTime) / 1000;
            const lapTime = currentTime - this.lastLapTime;
            this.lastLapTime = currentTime;
            
            this.laps++;
            this.lapTimes.push(lapTime);
            
            if (lapTime < this.bestLapTime && this.laps > 1) {
                this.bestLapTime = lapTime;
            }
            
            document.getElementById('laps').innerText = this.laps;
            this.updateHUD();
        }

        this.lastLapZone = inLapZone;
    }

    updateHUD() {
        const currentTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const speed = Math.abs(this.car.speed).toFixed(1);
        const bestLap = this.bestLapTime !== Infinity ? this.bestLapTime.toFixed(2) : '--';

        document.getElementById('timer').innerText = currentTime;
        document.getElementById('speed').innerText = speed;
        document.getElementById('bestLap').innerText = bestLap;
    }

    drawTrack() {
        const { outer, inner } = this.track;

        // Outer track (asphalt)
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(outer.x, outer.y, outer.width, outer.height);

        // Track grid pattern
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < outer.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(outer.x + i, outer.y);
            this.ctx.lineTo(outer.x + i, outer.y + outer.height);
            this.ctx.stroke();
        }

        // Inner grass
        this.ctx.fillStyle = '#1a4d1a';
        this.ctx.fillRect(inner.x, inner.y, inner.width, inner.height);

        // Start/finish line (checkered pattern)
        const lapZone = this.track.lapZone;
        const checkSize = 10;
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < lapZone.width; i += checkSize) {
            for (let j = 0; j < lapZone.height; j += checkSize) {
                if ((i + j) / checkSize % 2 === 0) {
                    this.ctx.fillRect(lapZone.x + i, lapZone.y + j, checkSize, checkSize);
                }
            }
        }

        // Track borders
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(outer.x, outer.y, outer.width, outer.height);
    }

    drawCar() {
        this.ctx.save();
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);

        // Car body
        this.ctx.fillStyle = '#ff2020';
        this.ctx.fillRect(-CONFIG.CAR_WIDTH / 2, -CONFIG.CAR_HEIGHT / 2, CONFIG.CAR_WIDTH, CONFIG.CAR_HEIGHT);

        // Car window
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(-CONFIG.CAR_WIDTH / 2 + 3, -CONFIG.CAR_HEIGHT / 2 + 10, CONFIG.CAR_WIDTH - 6, 15);

        // Car headlights
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(-8, -CONFIG.CAR_HEIGHT / 2 - 2, 3, 3);
        this.ctx.fillRect(5, -CONFIG.CAR_HEIGHT / 2 - 2, 3, 3);

        this.ctx.restore();
    }

    drawSpeedometer() {
        const speed = Math.abs(this.car.speed);
        const speedPercent = (speed / CONFIG.MAX_SPEED) * 100;
        
        // Speed bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(10, 10, 150, 20);
        this.ctx.fillStyle = speedPercent > 70 ? '#ff3333' : '#00ff00';
        this.ctx.fillRect(10, 10, 150 * (speedPercent / 100), 20);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, 150, 20);
    }

    gameLoop = () => {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw and update
        this.drawTrack();
        this.updateCar();
        this.drawCar();
        this.drawSpeedometer();
        this.checkLap();
        this.updateHUD();

        requestAnimationFrame(this.gameLoop);
    };
}

// Start game when page loads
window.addEventListener('load', () => {
    new Game();
});