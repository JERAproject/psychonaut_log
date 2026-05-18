import anime from 'animejs';

export function initLorenzAnimation() {
  // Configuración inicial
  anime.set('.landing-title', { opacity: 0, scale: 0.5, filter: 'blur(10px)' });
  anime.set('.landing-image-container', { opacity: 1, scale: 1 });
  
  // Animación de la imagen transformándose en el título
  const tl = anime.timeline({
    easing: 'easeOutExpo'
  });
  
  // Fase 1: La imagen se desvanece y se achica
  tl.add({
    targets: '.landing-image-container',
    opacity: 0,
    scale: 1.2,
    duration: 1200,
    delay: 500
  })
  // Fase 2: El título aparece emergiendo
  .add({
    targets: '.landing-title',
    opacity: [0, 1],
    scale: [0.3, 1],
    filter: ['blur(20px)', 'blur(0px)'],
    duration: 1500,
    easing: 'easeOutElastic(1, .6)'
  }, '-=800')
  // Subtítulo aparece después
  .add({
    targets: '.landing-subtitle',
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    easing: 'easeOutExpo'
  }, '-=400')
  // Prompt de práctica
  .add({
    targets: '.landing-prompt',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
    easing: 'easeOutExpo'
  }, '-=200');

  return tl;
}

// Función para iniciar el attractor de Lorenz en el canvas
export function initLorenzAttractor(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const sigma = 10;
  const rho = 28;
  const beta = 8/3;
  const dt = 0.008;
  const scale = 10;
  const offsetX = canvas.width / 2;
  const offsetY = canvas.height / 2;

  let x = 0.1, y = 0, z = 0;
  let time = 0;
  let animationId;

  function lorenz() {
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    
    x += dx;
    y += dy;
    z += dz;
    
    return { x, y, z };
  }

  function drawPoint(px, py, timeVal) {
    const hue = (timeVal * 3) % 360;
    const alpha = 0.6 + Math.sin(timeVal * 0.5) * 0.2;
    
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 75%, 60%, ${alpha})`;
    ctx.fill();
  }

  function animate() {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 3; i++) {
      const p = lorenz();
      const px = p.x * scale + offsetX;
      const py = (p.z - 25) * scale + offsetY;
      drawPoint(px, py, time);
      time += dt;
    }
    
    animationId = requestAnimationFrame(animate);
  }

  animate();

  return function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}