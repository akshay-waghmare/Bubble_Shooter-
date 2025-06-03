// Quick module test
import { GAME_CONFIG } from './config/gameConfig.js';
import { BubbleShooterApp } from './src/main.js';

console.log('Testing module imports...');
console.log('GAME_CONFIG:', GAME_CONFIG);

const app = new BubbleShooterApp();
console.log('App created:', app);
