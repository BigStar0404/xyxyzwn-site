import { useEffect, useRef, useState } from 'react'
import {
  createProjectile,
  createStaticSceneBackground,
  getSceneScale,
  renderScene,
  updateWaterSurfaceLayer,
} from '../lib/canvasScene'

const PROJECTILE_LIMIT = 48
const WATER_SURFACE_FRAME_MS = 50

function CanvasScene() {
  const canvasRef = useRef(null)
  const audioRef = useRef(null)
  const effectsAudioRef = useRef(null)
  const ambientParticlesRef = useRef([])
  const bubblesRef = useRef([])
  const hitParticlesRef = useRef([])
  const projectilesRef = useRef([])
  const pointerRef = useRef({ x: 0, y: 0, active: false })
  const staticBackgroundRef = useRef(null)
  const waterSurfaceRef = useRef(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let animationFrameId = 0
    let width = 0
    let height = 0
    let pixelRatio = 1
    let previousTime = 0
    let previousWaterSurfaceTime = -Infinity

    const resizeCanvas = () => {
      width = window.innerWidth
      height = window.innerHeight
      pixelRatio = getCanvasPixelRatio(width, height)

      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      staticBackgroundRef.current = createStaticSceneBackground(width, height, pixelRatio)
      waterSurfaceRef.current = updateWaterSurfaceLayer(
        waterSurfaceRef.current,
        width,
        height,
        pixelRatio,
        previousTime,
      )
      previousWaterSurfaceTime = previousTime
      ambientParticlesRef.current = []
      bubblesRef.current = []
      hitParticlesRef.current = []
      projectilesRef.current = []
      pointerRef.current.x = pointerRef.current.active ? pointerRef.current.x : width / 2
      pointerRef.current.y = pointerRef.current.active ? pointerRef.current.y : height * 0.38
    }

    const handlePointerMove = (event) => {
      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: true,
      }
    }

    const handlePointerDown = (event) => {
      if (!effectsAudioRef.current) {
        effectsAudioRef.current = createSoundEffects()
      }

      effectsAudioRef.current.playShoot()
      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: true,
      }

      projectilesRef.current.push(
        createProjectile({
          originX: width / 2,
          originY: height / 2,
          targetX: event.clientX,
          targetY: event.clientY,
          scale: getSceneScale(width, height),
        }),
      )

      if (projectilesRef.current.length > PROJECTILE_LIMIT) {
        projectilesRef.current.splice(0, projectilesRef.current.length - PROJECTILE_LIMIT)
      }
    }

    const animate = (time) => {
      if (time - previousWaterSurfaceTime >= WATER_SURFACE_FRAME_MS) {
        waterSurfaceRef.current = updateWaterSurfaceLayer(
          waterSurfaceRef.current,
          width,
          height,
          pixelRatio,
          time,
        )
        previousWaterSurfaceTime = time
      }

      renderScene(context, {
        width,
        height,
        pointer: pointerRef.current,
        ambientParticles: ambientParticlesRef.current,
        bubbles: bubblesRef.current,
        hitParticles: hitParticlesRef.current,
        projectiles: projectilesRef.current,
        staticBackground: staticBackgroundRef.current,
        waterSurface: waterSurfaceRef.current,
        onBubbleHit: () => effectsAudioRef.current?.playBubblePop(),
        deltaTime: previousTime ? Math.min(time - previousTime, 32) : 16,
        time,
      })
      previousTime = time
      animationFrameId = window.requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerdown', handlePointerDown)
    animationFrameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.stop()
      audioRef.current?.close()
      effectsAudioRef.current?.close()
    }
  }, [])

  const toggleMusic = async () => {
    if (!audioRef.current) {
      audioRef.current = createPoolMusic()
    }

    if (isMusicPlaying) {
      audioRef.current.stop()
      setIsMusicPlaying(false)
      return
    }

    await audioRef.current.start()
    setIsMusicPlaying(true)
  }

  return (
    <>
      <canvas ref={canvasRef} className="canvas-scene" aria-label="Summer pool turret scene" />
      <button className="music-toggle" type="button" onClick={toggleMusic}>
        {isMusicPlaying ? 'Pause Music' : 'Play Music'}
      </button>
    </>
  )
}

function getCanvasPixelRatio(width, height) {
  const devicePixelRatio = window.devicePixelRatio || 1
  const cssPixels = width * height
  const maxPixelRatio = cssPixels > 2_000_000 ? 1.25 : 1.5

  return Math.min(devicePixelRatio, maxPixelRatio)
}

function createSoundEffects() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const audioContext = new AudioContext()
  const masterGain = audioContext.createGain()

  masterGain.gain.value = 0.12
  masterGain.connect(audioContext.destination)

  return {
    async playShoot() {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const now = audioContext.currentTime
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const filter = audioContext.createBiquadFilter()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(620, now)
      oscillator.frequency.exponentialRampToValueAtTime(210, now + 0.16)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1200, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.9, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

      oscillator.connect(filter)
      filter.connect(gain)
      gain.connect(masterGain)
      oscillator.start(now)
      oscillator.stop(now + 0.2)
    },
    async playBubblePop() {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const now = audioContext.currentTime
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const filter = audioContext.createBiquadFilter()

      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(380, now)
      oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.045)
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(900, now)
      filter.Q.value = 3
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.62, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      oscillator.connect(filter)
      filter.connect(gain)
      gain.connect(masterGain)
      oscillator.start(now)
      oscillator.stop(now + 0.14)
    },
    close() {
      audioContext.close()
    },
  }
}

function createPoolMusic() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const audioContext = new AudioContext()
  const masterGain = audioContext.createGain()
  const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66]
  let intervalId = 0
  let noteIndex = 0

  masterGain.gain.value = 0.045
  masterGain.connect(audioContext.destination)

  const playNote = () => {
    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const noteGain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(notes[noteIndex % notes.length], now)
    noteGain.gain.setValueAtTime(0, now)
    noteGain.gain.linearRampToValueAtTime(0.8, now + 0.04)
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58)

    oscillator.connect(noteGain)
    noteGain.connect(masterGain)
    oscillator.start(now)
    oscillator.stop(now + 0.62)

    noteIndex += 1
  }

  return {
    async start() {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      window.clearInterval(intervalId)
      playNote()
      intervalId = window.setInterval(playNote, 520)
    },
    stop() {
      window.clearInterval(intervalId)
      intervalId = 0
    },
    close() {
      window.clearInterval(intervalId)
      intervalId = 0
      audioContext.close()
    },
  }
}

export default CanvasScene
