const POOL_SHADOW = 'rgba(29, 78, 216, 0.16)'
const WATER_LINE = 'rgba(255, 255, 255, 0.26)'
const AMBIENT_PARTICLE_LIMIT = 36
const BUBBLE_LIMIT = 20
const BUBBLE_MARGIN = 120
const BUBBLE_MAX_SPEED = 0.13
const BUBBLE_MIN_SPEED = 0.064
const BUBBLE_RADIUS_MAX = 34
const BUBBLE_RADIUS_MIN = 15
const HIT_PARTICLE_LIMIT = 80
const PROJECTILE_MARGIN = 90
const PROJECTILE_SPEED = 0.48
const PROJECTILE_LIFETIME = 5200
const BASE_SCENE_SIZE = 760

export function renderScene(context, scene) {
  const {
    width,
    height,
    pointer,
    ambientParticles,
    bubbles,
    hitParticles,
    onBubbleHit,
    projectiles,
    staticBackground,
    waterSurface,
    deltaTime,
    time,
  } = scene
  const sceneScale = getSceneScale(width, height)
  const center = {
    x: width / 2,
    y: height / 2,
  }
  const towerAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x)
  const pool = getPoolBounds(width, height)

  drawSceneBackground(context, width, height, pool, staticBackground)
  drawWaterSurfaceLayer(context, width, height, pool, waterSurface, time)
  updateAmbientParticles(ambientParticles, pool, deltaTime, sceneScale)
  drawAmbientParticles(context, ambientParticles, pool, time, sceneScale)
  updateBubbles(bubbles, width, height, deltaTime, sceneScale)
  updateProjectiles(projectiles, width, height, deltaTime)
  resolveProjectileBubbleHits(projectiles, bubbles, hitParticles, onBubbleHit, sceneScale)
  updateHitParticles(hitParticles, deltaTime)
  drawLotusDecorations(context, pool, time, sceneScale)
  drawTower(context, center.x, center.y, towerAngle, sceneScale)
  drawBubbles(context, bubbles, pool, sceneScale)
  drawProjectiles(context, projectiles, pool)
  drawHitParticles(context, hitParticles, pool, sceneScale)
}

export function createStaticSceneBackground(width, height, pixelRatio) {
  const background = document.createElement('canvas')
  const backgroundContext = background.getContext('2d')
  const pool = getPoolBounds(width, height)

  background.width = Math.floor(width * pixelRatio)
  background.height = Math.floor(height * pixelRatio)
  backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  drawSunlitDeck(backgroundContext, width, height)
  drawPoolBasin(backgroundContext, pool)

  return background
}

export function updateWaterSurfaceLayer(layer, width, height, pixelRatio, time) {
  const waterSurface = layer || document.createElement('canvas')
  const waterSurfaceContext = waterSurface.getContext('2d')
  const scaledWidth = Math.floor(width * pixelRatio)
  const scaledHeight = Math.floor(height * pixelRatio)

  if (waterSurface.width !== scaledWidth || waterSurface.height !== scaledHeight) {
    waterSurface.width = scaledWidth
    waterSurface.height = scaledHeight
  }

  waterSurfaceContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  clearScene(waterSurfaceContext, width, height)
  drawWaterSurface(waterSurfaceContext, getPoolBounds(width, height), time)

  return waterSurface
}

export function createProjectile({ originX, originY, targetX, targetY, scale = 1 }) {
  const angle = Math.atan2(targetY - originY, targetX - originX)
  const muzzleOffset = 62 * scale

  return {
    x: originX + Math.cos(angle) * muzzleOffset,
    y: originY + Math.sin(angle) * muzzleOffset,
    vx: Math.cos(angle) * PROJECTILE_SPEED * scale,
    vy: Math.sin(angle) * PROJECTILE_SPEED * scale,
    radius: 9 * scale,
    age: 0,
    lifetime: PROJECTILE_LIFETIME,
    wobble: Math.random() * Math.PI * 2,
  }
}

export function getSceneScale(width, height) {
  return clamp(Math.min(width, height) / BASE_SCENE_SIZE, 0.56, 1.08)
}

function clearScene(context, width, height) {
  context.clearRect(0, 0, width, height)
}

function drawSceneBackground(context, width, height, pool, staticBackground) {
  if (staticBackground) {
    context.drawImage(staticBackground, 0, 0, width, height)
    return
  }

  clearScene(context, width, height)
  drawSunlitDeck(context, width, height)
  drawPoolBasin(context, pool)
}

function drawWaterSurfaceLayer(context, width, height, pool, waterSurface, time) {
  if (waterSurface) {
    context.drawImage(waterSurface, 0, 0, width, height)
    return
  }

  drawWaterSurface(context, pool, time)
}

function drawSunlitDeck(context, width, height) {
  const skyGlow = context.createLinearGradient(0, 0, width, height)
  skyGlow.addColorStop(0, '#fff5bf')
  skyGlow.addColorStop(0.38, '#bceeff')
  skyGlow.addColorStop(1, '#78d8f0')

  context.fillStyle = skyGlow
  context.fillRect(0, 0, width, height)

  const sun = context.createRadialGradient(
    width * 0.16,
    height * 0.14,
    0,
    width * 0.16,
    height * 0.14,
    Math.min(width, height) * 0.42,
  )
  sun.addColorStop(0, 'rgba(255, 255, 255, 0.82)')
  sun.addColorStop(0.38, 'rgba(255, 224, 126, 0.26)')
  sun.addColorStop(1, 'rgba(255, 224, 126, 0)')

  context.fillStyle = sun
  context.fillRect(0, 0, width, height)
}

function getPoolBounds(width, height) {
  const margin = Math.max(12, Math.min(width, height) * 0.035)
  const poolWidth = width - margin * 2
  const poolHeight = height - margin * 2
  const x = margin
  const y = margin
  const radius = Math.max(22, Math.min(width, height) * 0.045)

  return {
    outerX: x,
    outerY: y,
    outerWidth: poolWidth,
    outerHeight: poolHeight,
    radius,
    x: x + 20,
    y: y + 20,
    width: poolWidth - 40,
    height: poolHeight - 40,
  }
}

function drawPoolBasin(context, pool) {
  const { outerX, outerY, outerWidth, outerHeight, radius } = pool

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.82)'
  context.shadowColor = POOL_SHADOW
  context.shadowBlur = 24
  context.shadowOffsetY = 8
  roundedRect(context, outerX, outerY, outerWidth, outerHeight, radius)
  context.fill()
  context.restore()

  drawPoolRim(context, outerX, outerY, outerWidth, outerHeight, radius)

  const waterGradient = context.createRadialGradient(
    outerX + outerWidth * 0.5,
    outerY + outerHeight * 0.42,
    outerHeight * 0.08,
    outerX + outerWidth * 0.5,
    outerY + outerHeight * 0.5,
    outerWidth * 0.56,
  )
  waterGradient.addColorStop(0, '#a8f3ff')
  waterGradient.addColorStop(0.48, '#32c5ec')
  waterGradient.addColorStop(1, '#1593c7')

  context.save()
  roundedRect(context, pool.x, pool.y, pool.width, pool.height, Math.max(18, radius - 12))
  context.clip()
  context.fillStyle = waterGradient
  context.fillRect(outerX, outerY, outerWidth, outerHeight)
  drawTilePattern(context, outerX, outerY, outerWidth, outerHeight)
  context.restore()
}

function drawPoolRim(context, x, y, poolWidth, poolHeight, radius) {
  context.save()
  const rimGradient = context.createLinearGradient(x, y, x + poolWidth, y + poolHeight)
  rimGradient.addColorStop(0, '#ffffff')
  rimGradient.addColorStop(0.45, '#e0f7ff')
  rimGradient.addColorStop(1, '#a7e8ff')

  context.shadowColor = 'rgba(255, 255, 255, 0.58)'
  context.shadowBlur = 18
  context.strokeStyle = rimGradient
  context.lineWidth = 20
  roundedRect(context, x + 10, y + 10, poolWidth - 20, poolHeight - 20, Math.max(18, radius - 8))
  context.stroke()

  context.shadowBlur = 0
  context.strokeStyle = 'rgba(14, 165, 233, 0.42)'
  context.lineWidth = 5
  roundedRect(context, x + 24, y + 24, poolWidth - 48, poolHeight - 48, Math.max(14, radius - 18))
  context.stroke()

  context.strokeStyle = 'rgba(255, 255, 255, 0.72)'
  context.lineWidth = 2
  roundedRect(context, x + 31, y + 31, poolWidth - 62, poolHeight - 62, Math.max(12, radius - 22))
  context.stroke()
  context.restore()
}

function drawTilePattern(context, x, y, width, height) {
  context.save()
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  context.lineWidth = 1

  for (let tileX = x; tileX <= x + width; tileX += 54) {
    context.beginPath()
    context.moveTo(tileX, y)
    context.lineTo(tileX, y + height)
    context.stroke()
  }

  for (let tileY = y; tileY <= y + height; tileY += 54) {
    context.beginPath()
    context.moveTo(x, tileY)
    context.lineTo(x + width, tileY)
    context.stroke()
  }

  context.restore()
}

function drawWaterSurface(context, pool, time) {
  const spacing = 34
  const drift = (time * 0.014) % spacing
  const { x, y, width, height } = pool

  context.save()
  roundedRect(context, x, y, width, height, 22)
  context.clip()
  context.strokeStyle = WATER_LINE
  context.lineWidth = 1.4

  for (let waveY = y - spacing; waveY < y + height + spacing; waveY += spacing) {
    context.beginPath()
    for (let waveX = x - 20; waveX <= x + width + 20; waveX += 24) {
      const currentY = waveY + drift + Math.sin(waveX * 0.019 + time * 0.0012) * 4
      if (waveX === x - 20) {
        context.moveTo(waveX, currentY)
      } else {
        context.lineTo(waveX, currentY)
      }
    }
    context.stroke()
  }

  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  context.lineWidth = 2

  for (let waveY = y; waveY < y + height; waveY += 92) {
    context.beginPath()
    for (let waveX = x - 40; waveX <= x + width + 40; waveX += 36) {
      const currentY = waveY + Math.sin(waveX * 0.026 + time * 0.001) * 8
      if (waveX === x - 40) {
        context.moveTo(waveX, currentY)
      } else {
        context.lineTo(waveX, currentY)
      }
    }
    context.stroke()
  }

  context.strokeStyle = 'rgba(186, 246, 255, 0.22)'
  context.lineWidth = 3
  for (let waveY = y + 28; waveY < y + height; waveY += 128) {
    context.beginPath()
    for (let waveX = x - 50; waveX <= x + width + 50; waveX += 42) {
      const currentY =
        waveY +
        Math.sin(waveX * 0.018 + time * 0.0018) * 9 +
        Math.cos(waveX * 0.011 + time * 0.0011) * 5
      if (waveX === x - 50) {
        context.moveTo(waveX, currentY)
      } else {
        context.lineTo(waveX, currentY)
      }
    }
    context.stroke()
  }

  const sparkle = context.createRadialGradient(
    x + width * 0.5,
    y + height * 0.38,
    0,
    x + width * 0.5,
    y + height * 0.38,
    Math.min(width, height) * 0.42,
  )
  sparkle.addColorStop(0, 'rgba(255, 255, 255, 0.24)')
  sparkle.addColorStop(0.42, 'rgba(255, 247, 184, 0.12)')
  sparkle.addColorStop(1, 'rgba(255, 255, 255, 0)')

  context.fillStyle = sparkle
  context.fillRect(x, y, width, height)

  drawWaterCaustics(context, pool, time)
  context.restore()
}

function drawWaterCaustics(context, pool, time) {
  const { x, y, width, height } = pool

  context.save()
  context.globalAlpha = 0.42
  context.strokeStyle = 'rgba(255, 255, 255, 0.38)'
  context.lineWidth = 1.2

  for (let index = 0; index < 16; index += 1) {
    const baseX = x + ((index * 97 + time * 0.018) % width)
    const baseY = y + ((index * 61 + time * 0.012) % height)

    context.beginPath()
    context.ellipse(
      baseX,
      baseY,
      24 + (index % 4) * 8,
      7 + (index % 3) * 2,
      Math.sin(time * 0.0006 + index) * 0.8,
      0,
      Math.PI * 2,
    )
    context.stroke()
  }

  context.restore()
}

function updateAmbientParticles(particles, pool, deltaTime, sceneScale) {
  while (particles.length < AMBIENT_PARTICLE_LIMIT) {
    particles.push(createAmbientParticle(pool, sceneScale))
  }

  for (const particle of particles) {
    particle.age += deltaTime
    particle.x += particle.vx * deltaTime
    particle.y += particle.vy * deltaTime
    particle.pulse += particle.pulseSpeed * deltaTime

    if (
      particle.age > particle.lifetime ||
      particle.x < pool.x - 24 * sceneScale ||
      particle.x > pool.x + pool.width + 24 * sceneScale ||
      particle.y < pool.y - 24 * sceneScale ||
      particle.y > pool.y + pool.height + 24 * sceneScale
    ) {
      Object.assign(particle, createAmbientParticle(pool, sceneScale))
    }
  }
}

function createAmbientParticle(pool, sceneScale) {
  return {
    x: randomBetween(pool.x, pool.x + pool.width),
    y: randomBetween(pool.y, pool.y + pool.height),
    vx: randomBetween(-0.012, 0.012),
    vy: randomBetween(-0.018, -0.004),
    radius: randomBetween(1.2, 3.4) * sceneScale,
    alpha: randomBetween(0.18, 0.42),
    age: 0,
    lifetime: randomBetween(3600, 7600),
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: randomBetween(0.0012, 0.0028),
  }
}

function drawAmbientParticles(context, particles, pool, time, sceneScale) {
  context.save()
  roundedRect(context, pool.x, pool.y, pool.width, pool.height, 22)
  context.clip()
  context.shadowColor = 'rgba(255, 255, 255, 0.78)'
  context.shadowBlur = 8 * sceneScale

  for (const particle of particles) {
    const alpha = particle.alpha * (0.64 + Math.sin(particle.pulse + time * 0.001) * 0.28)

    context.fillStyle = `rgba(255, 255, 255, ${alpha})`
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()
}

function updateBubbles(bubbles, width, height, deltaTime, sceneScale) {
  if (bubbles.length < BUBBLE_LIMIT && Math.random() < 0.035) {
    bubbles.push(createBubbleFromEdge(width, height, sceneScale))
  }

  for (const bubble of bubbles) {
    bubble.x += bubble.vx * deltaTime
    bubble.y += bubble.vy * deltaTime
    bubble.wobble += deltaTime * bubble.wobbleSpeed
  }

  resolveBubbleCollisions(bubbles, sceneScale)
  removeOutOfBoundsBubbles(bubbles, width, height, sceneScale)
}

function createBubbleFromEdge(width, height, sceneScale) {
  const radius = randomBetween(BUBBLE_RADIUS_MIN, BUBBLE_RADIUS_MAX) * sceneScale
  const side = Math.floor(Math.random() * 4)
  const speed = randomBetween(BUBBLE_MIN_SPEED, BUBBLE_MAX_SPEED) * sceneScale
  const targetX = randomBetween(width * 0.14, width * 0.86)
  const targetY = randomBetween(height * 0.14, height * 0.86)
  let x
  let y

  if (side === 0) {
    x = randomBetween(0, width)
    y = -radius
  } else if (side === 1) {
    x = width + radius
    y = randomBetween(0, height)
  } else if (side === 2) {
    x = randomBetween(0, width)
    y = height + radius
  } else {
    x = -radius
    y = randomBetween(0, height)
  }

  const angle = Math.atan2(targetY - y, targetX - x)

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    alpha: randomBetween(0.42, 0.68),
    wobble: Math.random() * Math.PI * 2,
    wobbleAmount: randomBetween(0.35, 0.75),
    wobbleSpeed: randomBetween(0.002, 0.005),
  }
}

function resolveBubbleCollisions(bubbles, sceneScale) {
  for (let index = 0; index < bubbles.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < bubbles.length; nextIndex += 1) {
      const first = bubbles[index]
      const second = bubbles[nextIndex]
      const dx = second.x - first.x
      const dy = second.y - first.y
      const distance = Math.hypot(dx, dy) || 1
      const minDistance = first.radius + second.radius + 4 * sceneScale

      if (distance >= minDistance) {
        continue
      }

      const overlap = (minDistance - distance) * 0.5
      const nx = dx / distance
      const ny = dy / distance

      first.x -= nx * overlap
      first.y -= ny * overlap
      second.x += nx * overlap
      second.y += ny * overlap

      const push = 0.0008 * sceneScale
      first.vx -= nx * push
      first.vy -= ny * push
      second.vx += nx * push
      second.vy += ny * push
      clampBubbleSpeed(first, sceneScale)
      clampBubbleSpeed(second, sceneScale)
    }
  }
}

function clampBubbleSpeed(bubble, sceneScale) {
  const speed = Math.hypot(bubble.vx, bubble.vy)
  const maxSpeed = BUBBLE_MAX_SPEED * sceneScale

  if (speed <= maxSpeed) {
    return
  }

  bubble.vx = (bubble.vx / speed) * maxSpeed
  bubble.vy = (bubble.vy / speed) * maxSpeed
}

function removeOutOfBoundsBubbles(bubbles, width, height, sceneScale) {
  for (let index = bubbles.length - 1; index >= 0; index -= 1) {
    const bubble = bubbles[index]
    const margin = BUBBLE_MARGIN * sceneScale
    const isOutside =
      bubble.x < -margin ||
      bubble.x > width + margin ||
      bubble.y < -margin ||
      bubble.y > height + margin

    if (isOutside) {
      bubbles.splice(index, 1)
    }
  }
}

function drawBubbles(context, bubbles, pool, sceneScale) {
  context.save()
  roundedRect(context, pool.x, pool.y, pool.width, pool.height, 22)
  context.clip()

  for (const bubble of bubbles) {
    context.save()
    context.shadowColor = `rgba(186, 246, 255, ${bubble.alpha * 0.9})`
    context.shadowBlur = 14 * sceneScale

    const highlightOffset = bubble.radius * 0.36
    const gradient = context.createRadialGradient(
      bubble.x - highlightOffset,
      bubble.y - highlightOffset,
      bubble.radius * 0.12,
      bubble.x,
      bubble.y,
      bubble.radius,
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, bubble.alpha + 0.3)})`)
    gradient.addColorStop(0.38, `rgba(224, 252, 255, ${bubble.alpha * 0.42})`)
    gradient.addColorStop(0.72, `rgba(125, 211, 252, ${bubble.alpha * 0.22})`)
    gradient.addColorStop(1, `rgba(14, 165, 233, ${bubble.alpha * 0.18})`)

    context.fillStyle = gradient
    context.strokeStyle = `rgba(255, 255, 255, ${bubble.alpha})`
    context.lineWidth = 2 * sceneScale
    context.beginPath()
    context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    context.shadowBlur = 0
    context.fillStyle = `rgba(255, 255, 255, ${bubble.alpha * 0.75})`
    context.beginPath()
    context.arc(
      bubble.x - bubble.radius * 0.34,
      bubble.y - bubble.radius * 0.36,
      bubble.radius * 0.16,
      0,
      Math.PI * 2,
    )
    context.fill()
    context.restore()
  }

  context.restore()
}

function updateProjectiles(projectiles, width, height, deltaTime) {
  for (const projectile of projectiles) {
    projectile.age += deltaTime
    projectile.wobble += deltaTime * 0.018
    projectile.x += projectile.vx * deltaTime
    projectile.y += projectile.vy * deltaTime + Math.sin(projectile.wobble) * 0.012 * deltaTime
  }

  removeExpiredProjectiles(projectiles, width, height)
}

function removeExpiredProjectiles(projectiles, width, height) {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index]
    const isExpired = projectile.age >= projectile.lifetime
    const isOutside =
      projectile.x < -PROJECTILE_MARGIN ||
      projectile.x > width + PROJECTILE_MARGIN ||
      projectile.y < -PROJECTILE_MARGIN ||
      projectile.y > height + PROJECTILE_MARGIN

    if (isExpired || isOutside) {
      projectiles.splice(index, 1)
    }
  }
}

function drawProjectiles(context, projectiles, pool) {
  context.save()
  roundedRect(context, pool.x, pool.y, pool.width, pool.height, 22)
  context.clip()

  for (const projectile of projectiles) {
    const lifeProgress = projectile.age / projectile.lifetime
    const alpha = Math.max(0, 1 - lifeProgress)
    const tailX = projectile.x - projectile.vx * 135
    const tailY = projectile.y - projectile.vy * 135
    const trailGradient = context.createLinearGradient(tailX, tailY, projectile.x, projectile.y)

    trailGradient.addColorStop(0, `rgba(125, 211, 252, 0)`)
    trailGradient.addColorStop(0.55, `rgba(186, 246, 255, ${alpha * 0.22})`)
    trailGradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.72})`)

    context.shadowColor = `rgba(125, 211, 252, ${alpha * 0.8})`
    context.shadowBlur = 12
    context.strokeStyle = trailGradient
    context.lineWidth = projectile.radius * 1.05
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(tailX, tailY)
    context.lineTo(projectile.x, projectile.y)
    context.stroke()

    const gradient = context.createRadialGradient(
      projectile.x - projectile.radius * 0.35,
      projectile.y - projectile.radius * 0.35,
      1,
      projectile.x,
      projectile.y,
      projectile.radius,
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    gradient.addColorStop(0.45, `rgba(186, 246, 255, ${alpha * 0.9})`)
    gradient.addColorStop(1, `rgba(14, 165, 233, ${alpha * 0.72})`)

    context.shadowBlur = 16
    context.fillStyle = gradient
    context.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.82})`
    context.lineWidth = 2
    context.beginPath()
    context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }

  context.restore()
}

function resolveProjectileBubbleHits(projectiles, bubbles, hitParticles, onBubbleHit, sceneScale) {
  for (let projectileIndex = projectiles.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
    const projectile = projectiles[projectileIndex]

    for (let bubbleIndex = bubbles.length - 1; bubbleIndex >= 0; bubbleIndex -= 1) {
      const bubble = bubbles[bubbleIndex]
      const dx = bubble.x - projectile.x
      const dy = bubble.y - projectile.y
      const hitDistance = bubble.radius + projectile.radius

      if (dx * dx + dy * dy > hitDistance * hitDistance) {
        continue
      }

      createHitParticles(hitParticles, bubble.x, bubble.y, bubble.radius, sceneScale)
      bubbles.splice(bubbleIndex, 1)
      projectiles.splice(projectileIndex, 1)
      onBubbleHit?.()
      break
    }
  }
}

function createHitParticles(hitParticles, x, y, radius, sceneScale) {
  const particleCount = Math.min(12, Math.max(8, Math.round(radius * 0.34)))

  for (let index = 0; index < particleCount; index += 1) {
    const angle = (Math.PI * 2 * index) / particleCount + randomBetween(-0.22, 0.22)
    const speed = randomBetween(0.08, 0.18) * sceneScale

    hitParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomBetween(2, 4.5) * sceneScale,
      age: 0,
      lifetime: randomBetween(360, 560),
      hue: randomBetween(190, 205),
    })
  }

  if (hitParticles.length > HIT_PARTICLE_LIMIT) {
    hitParticles.splice(0, hitParticles.length - HIT_PARTICLE_LIMIT)
  }
}

function updateHitParticles(hitParticles, deltaTime) {
  for (const particle of hitParticles) {
    particle.age += deltaTime
    particle.x += particle.vx * deltaTime
    particle.y += particle.vy * deltaTime
    particle.vy += 0.00005 * deltaTime
  }

  for (let index = hitParticles.length - 1; index >= 0; index -= 1) {
    if (hitParticles[index].age >= hitParticles[index].lifetime) {
      hitParticles.splice(index, 1)
    }
  }
}

function drawHitParticles(context, hitParticles, pool, sceneScale) {
  context.save()
  roundedRect(context, pool.x, pool.y, pool.width, pool.height, 22)
  context.clip()

  for (const particle of hitParticles) {
    const alpha = Math.max(0, 1 - particle.age / particle.lifetime)

    context.shadowColor = `hsla(${particle.hue}, 96%, 78%, ${alpha})`
    context.shadowBlur = 10 * sceneScale
    context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
    context.strokeStyle = `rgba(125, 211, 252, ${alpha * 0.7})`
    context.lineWidth = 1.5 * sceneScale
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }

  context.restore()
}

function drawLotusDecorations(context, pool, time, sceneScale) {
  const sway = Math.sin(time * 0.0012) * 3 * sceneScale

  drawLilyPad(context, pool.x + pool.width * 0.17, pool.y + pool.height * 0.24 + sway, 44 * sceneScale, -0.4, sceneScale)
  drawLotusFlower(context, pool.x + pool.width * 0.25, pool.y + pool.height * 0.3 - sway, 26 * sceneScale, sceneScale)
  drawLilyPad(context, pool.x + pool.width * 0.78, pool.y + pool.height * 0.22 - sway, 52 * sceneScale, 0.3, sceneScale)
  drawLotusSeedPod(context, pool.x + pool.width * 0.72, pool.y + pool.height * 0.32 + sway, 22 * sceneScale, sceneScale)
  drawLilyPad(context, pool.x + pool.width * 0.15, pool.y + pool.height * 0.78 - sway, 58 * sceneScale, 0.55, sceneScale)
  drawLotusFlower(context, pool.x + pool.width * 0.84, pool.y + pool.height * 0.72 + sway, 30 * sceneScale, sceneScale)
}

function drawLilyPad(context, x, y, radius, rotation, sceneScale) {
  context.save()
  context.translate(x, y)
  context.rotate(rotation)

  context.fillStyle = '#4ade80'
  context.strokeStyle = '#15803d'
  context.lineWidth = 3 * sceneScale
  context.beginPath()
  context.arc(0, 0, radius, 0.28, Math.PI * 1.9)
  context.lineTo(0, 0)
  context.closePath()
  context.fill()
  context.stroke()

  context.strokeStyle = 'rgba(255, 255, 255, 0.32)'
  context.lineWidth = 2 * sceneScale
  for (let angle = 0.45; angle < Math.PI * 1.78; angle += 0.55) {
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(Math.cos(angle) * radius * 0.72, Math.sin(angle) * radius * 0.72)
    context.stroke()
  }

  context.restore()
}

function drawLotusFlower(context, x, y, size, sceneScale) {
  context.save()
  context.translate(x, y)

  const petals = [
    [0, -size * 0.56, 0],
    [-size * 0.34, -size * 0.22, -0.72],
    [size * 0.34, -size * 0.22, 0.72],
    [-size * 0.24, size * 0.18, -1.12],
    [size * 0.24, size * 0.18, 1.12],
  ]

  for (const [petalX, petalY, rotation] of petals) {
    context.save()
    context.translate(petalX, petalY)
    context.rotate(rotation)
    context.fillStyle = '#f9a8d4'
    context.strokeStyle = '#f472b6'
    context.lineWidth = 2 * sceneScale
    context.beginPath()
    context.ellipse(0, 0, size * 0.32, size * 0.62, 0, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.restore()
  }

  context.fillStyle = '#fde047'
  context.beginPath()
  context.arc(0, 0, size * 0.2, 0, Math.PI * 2)
  context.fill()

  context.restore()
}

function drawLotusSeedPod(context, x, y, size, sceneScale) {
  context.save()
  context.translate(x, y)

  context.fillStyle = '#bef264'
  context.strokeStyle = '#65a30d'
  context.lineWidth = 3 * sceneScale
  context.beginPath()
  context.ellipse(0, 0, size * 0.88, size * 0.68, -0.2, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#4d7c0f'
  for (let row = -1; row <= 1; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      context.beginPath()
      context.arc(col * size * 0.24, row * size * 0.18, size * 0.07, 0, Math.PI * 2)
      context.fill()
    }
  }

  context.restore()
}

function drawTower(context, x, y, angle, sceneScale) {
  context.save()
  context.translate(x, y)
  context.scale(sceneScale, sceneScale)

  drawTowerBase(context)
  drawTowerHead(context, angle)

  context.restore()
}

function drawTowerBase(context) {
  context.save()

  const baseGlow = context.createRadialGradient(0, 0, 10, 0, 0, 108)
  baseGlow.addColorStop(0, 'rgba(255, 255, 255, 0.56)')
  baseGlow.addColorStop(0.5, 'rgba(125, 211, 252, 0.16)')
  baseGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')

  context.fillStyle = baseGlow
  context.beginPath()
  context.arc(0, 0, 108, 0, Math.PI * 2)
  context.fill()

  context.shadowColor = 'rgba(14, 165, 233, 0.34)'
  context.shadowBlur = 16
  context.fillStyle = '#f8fdff'
  context.strokeStyle = 'rgba(14, 116, 144, 0.34)'
  context.lineWidth = 3
  context.beginPath()
  context.arc(0, 0, 54, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.shadowBlur = 0
  context.strokeStyle = 'rgba(14, 116, 144, 0.18)'
  context.lineWidth = 2
  context.beginPath()
  context.arc(0, 0, 42, 0, Math.PI * 2)
  context.stroke()

  context.fillStyle = '#dff7ff'
  context.strokeStyle = 'rgba(14, 116, 144, 0.28)'
  context.lineWidth = 2
  context.beginPath()
  context.arc(0, 0, 32, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = 'rgba(255, 255, 255, 0.62)'
  context.beginPath()
  context.ellipse(-12, -16, 16, 8, -0.45, 0, Math.PI * 2)
  context.fill()

  context.restore()
}

function drawTowerHead(context, angle) {
  context.save()
  context.rotate(angle)

  const barrelGradient = context.createLinearGradient(-8, -15, 66, 15)
  barrelGradient.addColorStop(0, '#ffffff')
  barrelGradient.addColorStop(0.48, '#dff7ff')
  barrelGradient.addColorStop(1, '#38bdf8')

  context.shadowColor = 'rgba(14, 165, 233, 0.36)'
  context.shadowBlur = 10
  context.fillStyle = barrelGradient
  context.strokeStyle = 'rgba(3, 105, 161, 0.42)'
  context.lineWidth = 2.5
  roundedRect(context, -8, -15, 64, 30, 10)
  context.fill()
  context.stroke()

  context.shadowBlur = 6
  context.fillStyle = '#0284c7'
  roundedRect(context, 26, -8, 46, 16, 6)
  context.fill()

  context.fillStyle = '#075985'
  roundedRect(context, 62, -6, 14, 12, 5)
  context.fill()

  context.shadowBlur = 0
  context.fillStyle = '#0ea5e9'
  context.strokeStyle = 'rgba(255, 255, 255, 0.62)'
  context.lineWidth = 2
  context.beginPath()
  context.arc(0, 0, 21, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#fff7cc'
  context.beginPath()
  context.arc(0, 0, 8.5, 0, Math.PI * 2)
  context.fill()

  context.restore()
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.arcTo(x + width, y, x + width, y + height, safeRadius)
  context.arcTo(x + width, y + height, x, y + height, safeRadius)
  context.arcTo(x, y + height, x, y, safeRadius)
  context.arcTo(x, y, x + width, y, safeRadius)
  context.closePath()
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
