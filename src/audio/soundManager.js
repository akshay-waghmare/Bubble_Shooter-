// Audio System for Game Sound Effects

export class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.audioContext = null;
        this.masterVolume = 0.5;
        this.enabled = true;
        this.loadingSounds = new Set();
        this.initializeAudioContext();
        this.loadSounds();
    }

    /**
     * Initialize the sound manager - called by Game constructor
     */
    initialize() {
        console.log('🔊 SoundManager initialized');
        // Re-initialize if needed
        if (!this.audioContext) {
            this.initializeAudioContext();
        }
        if (this.sounds.size === 0) {
            this.loadSounds();
        }
        return true;
    }

    /**
     * Initialize Web Audio API context
     */
    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized successfully');
        } catch (error) {
            console.warn('Web Audio API not supported, falling back to HTML5 audio:', error);
            this.audioContext = null;
        }
    }

    /**
     * Load all game sound effects
     */
    loadSounds() {
        const soundFiles = {
            shoot: this.createSynthSound('shoot'),
            pop: this.createSynthSound('pop'),
            bounce: this.createSynthSound('bounce'),
            attach: this.createSynthSound('attach'),
            fall: this.createSynthSound('fall'),
            win: this.createSynthSound('win'),
            lose: this.createSynthSound('lose'),
            newRow: this.createSynthSound('newRow')
        };

        // Store synthesized sounds
        for (const [name, soundData] of Object.entries(soundFiles)) {
            this.sounds.set(name, soundData);
        }

        console.log('Sound effects loaded:', Array.from(this.sounds.keys()));
    }

    /**
     * Create synthesized sound effects using Web Audio API
     */
    createSynthSound(type) {
        if (!this.audioContext) {
            return this.createHtmlAudioFallback(type);
        }

        const soundConfig = this.getSoundConfig(type);
        return {
            type: 'synth',
            config: soundConfig,
            play: () => this.playSynthSound(soundConfig)
        };
    }

    /**
     * Get sound configuration for different effect types
     */
    getSoundConfig(type) {
        const configs = {
            shoot: {
                type: 'sine',
                frequency: 440,
                duration: 0.1,
                volume: 0.3,
                envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.04 }
            },
            pop: {
                type: 'square',
                frequency: 660,
                duration: 0.15,
                volume: 0.4,
                envelope: { attack: 0.01, decay: 0.08, sustain: 0.2, release: 0.06 }
            },
            bounce: {
                type: 'triangle',
                frequency: 220,
                duration: 0.08,
                volume: 0.25,
                envelope: { attack: 0.005, decay: 0.03, sustain: 0.4, release: 0.045 }
            },
            attach: {
                type: 'sawtooth',
                frequency: 330,
                duration: 0.12,
                volume: 0.35,
                envelope: { attack: 0.01, decay: 0.06, sustain: 0.25, release: 0.05 }
            },
            fall: {
                type: 'sine',
                frequency: 880,
                duration: 0.3,
                volume: 0.3,
                envelope: { attack: 0.02, decay: 0.15, sustain: 0.1, release: 0.13 },
                frequencySlide: -400 // Falling pitch
            },
            win: {
                type: 'sine',
                frequency: 523,
                duration: 0.5,
                volume: 0.4,
                envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.25 },
                harmony: [659, 784] // Major chord
            },
            lose: {
                type: 'square',
                frequency: 147,
                duration: 0.8,
                volume: 0.35,
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.5 }
            },
            newRow: {
                type: 'triangle',
                frequency: 392,
                duration: 0.2,
                volume: 0.3,
                envelope: { attack: 0.02, decay: 0.08, sustain: 0.3, release: 0.1 }
            }
        };

        return configs[type] || configs.shoot;
    }

    /**
     * Play synthesized sound effect
     */
    playSynthSound(config) {
        if (!this.audioContext || !this.enabled) return;

        try {
            const startTime = this.audioContext.currentTime;
            const endTime = startTime + config.duration;

            // Create oscillator
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Set oscillator properties
            oscillator.type = config.type;
            oscillator.frequency.setValueAtTime(config.frequency, startTime);

            // Handle frequency slide (for falling sounds)
            if (config.frequencySlide) {
                oscillator.frequency.linearRampToValueAtTime(
                    config.frequency + config.frequencySlide,
                    endTime
                );
            }

            // Apply volume envelope
            const env = config.envelope;
            const attackEnd = startTime + env.attack;
            const decayEnd = attackEnd + env.decay;
            const releaseStart = endTime - env.release;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(config.volume * this.masterVolume, attackEnd);
            gainNode.gain.linearRampToValueAtTime(config.volume * this.masterVolume * env.sustain, decayEnd);
            gainNode.gain.setValueAtTime(config.volume * this.masterVolume * env.sustain, releaseStart);
            gainNode.gain.linearRampToValueAtTime(0, endTime);

            // Start and stop oscillator
            oscillator.start(startTime);
            oscillator.stop(endTime);

            // Play harmony notes for complex sounds
            if (config.harmony) {
                config.harmony.forEach(freq => {
                    const harmOsc = this.audioContext.createOscillator();
                    const harmGain = this.audioContext.createGain();

                    harmOsc.connect(harmGain);
                    harmGain.connect(this.audioContext.destination);

                    harmOsc.type = config.type;
                    harmOsc.frequency.setValueAtTime(freq, startTime);

                    // Reduce volume for harmony
                    const harmVolume = config.volume * 0.6 * this.masterVolume;
                    harmGain.gain.setValueAtTime(0, startTime);
                    harmGain.gain.linearRampToValueAtTime(harmVolume, attackEnd);
                    harmGain.gain.linearRampToValueAtTime(harmVolume * env.sustain, decayEnd);
                    harmGain.gain.setValueAtTime(harmVolume * env.sustain, releaseStart);
                    harmGain.gain.linearRampToValueAtTime(0, endTime);

                    harmOsc.start(startTime);
                    harmOsc.stop(endTime);
                });
            }

        } catch (error) {
            console.warn('Error playing synthesized sound:', error);
        }
    }

    /**
     * Fallback to simple beep sounds for browsers without Web Audio API
     */
    createHtmlAudioFallback(type) {
        return {
            type: 'fallback',
            play: () => {
                if (!this.enabled) return;
                
                // Simple beep using oscillator in older browsers
                try {
                    const audio = new Audio();
                    audio.src = `data:audio/wav;base64,${this.generateSimpleBeep(type)}`;
                    audio.volume = this.masterVolume;
                    audio.play().catch(err => console.warn('Audio playback failed:', err));
                } catch (error) {
                    console.warn('HTML5 audio fallback failed:', error);
                }
            }
        };
    }

    /**
     * Generate simple beep data for fallback
     */
    generateSimpleBeep(type) {
        // This is a placeholder - in a real implementation, you would generate
        // proper WAV data or use pre-recorded sound files
        return '';
    }

    /**
     * Play a sound effect by name
     */
    playSound(soundName) {
        if (!this.enabled) return;

        const sound = this.sounds.get(soundName);
        if (sound) {
            try {
                sound.play();
            } catch (error) {
                console.warn(`Error playing sound "${soundName}":`, error);
            }
        } else {
            console.warn(`Sound "${soundName}" not found`);
        }
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        console.log('Master volume set to:', this.masterVolume);
    }

    /**
     * Enable or disable all sounds
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('Sound system', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Stop all sounds and clean up resources
     */
    stop() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            console.log('Audio context closed');
        }
        this.sounds.clear();
    }

    /**
     * Get audio system status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            volume: this.masterVolume,
            soundsLoaded: this.sounds.size,
            audioContextState: this.audioContext ? this.audioContext.state : 'not available',
            availableSounds: Array.from(this.sounds.keys())
        };
    }
}
