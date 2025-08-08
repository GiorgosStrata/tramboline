(() => {
  const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

  // Gravity values for planets
  const gravityByPlanet = {
    earth: 1,
    moon: 0.165,
    jupiter: 2.528,
  };

  // Background colors for planets
  const backgroundByPlanet = {
    earth: 'linear-gradient(to bottom, #87ceeb 0%, #1e3c72 100%)',   // blue sky gradient
    moon: 'linear-gradient(to bottom, #999999 0%, #222222 100%)',    // gray moon-like
    jupiter: 'linear-gradient(to bottom, #d4af37 0%, #7b5100 100%)', // golden brown for Jupiter
  };

  // Setup engine and world
  const engine = Engine.create();
  engine.gravity.y = gravityByPlanet.earth;
  const world = engine.world;

  // Setup canvas and renderer
  const canvas = document.getElementById('world');
  const uiHeight = document.querySelector('.ui').offsetHeight;

  const render = Render.create({
    canvas,
    engine,
    options: {
      wireframes: false,
      background: backgroundByPlanet.earth,
      width: window.innerWidth,
      height: window.innerHeight - uiHeight,
      pixelRatio: window.devicePixelRatio,
    },
  });

  Render.run(render);

  const runner = Runner.create();
  Runner.run(runner, engine);

  // Resize canvas on window resize
  window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight - uiHeight;
    Render.lookAt(render, Composite.allBodies(world));
  });

  // Remove old trampoline/ground if any
  let trampoline, ground;

  // Create a classic trampoline as a fixed, bouncy rectangle near bottom of screen
  function createTrampoline() {
    const width = window.innerWidth * 0.6;
    const height = 20;
    const yPos = render.canvas.height - height - 10; // 10 px above bottom

    if (trampoline) Composite.remove(world, trampoline);
    if (ground) Composite.remove(world, ground);

    // Trampoline: static but very bouncy
    trampoline = Bodies.rectangle(
      window.innerWidth / 2,
      yPos,
      width,
      height,
      {
        isStatic: true,
        restitution: 1.1, // >1 for extra bounce effect
        friction: 0.1,
        render: {
          fillStyle: '#27ae60',
          strokeStyle: '#145214',
          lineWidth: 3,
        },
      }
    );

    // Ground below trampoline to catch falling shapes
    ground = Bodies.rectangle(
      window.innerWidth / 2,
      yPos + 50,
      window.innerWidth,
      60,
      {
        isStatic: true,
        restitution: 0,
        friction: 0.6,
        render: {
          fillStyle: '#555555',
        },
      }
    );

    Composite.add(world, [trampoline, ground]);
  }

  createTrampoline();

  // UI Elements
  const planetSelect = document.getElementById('planet-select');
  const massSlider = document.getElementById('mass-slider');
  const sizeSlider = document.getElementById('size-slider');
  const massValueLabel = document.getElementById('mass-value');
  const sizeValueLabel = document.getElementById('size-value');

  // Update slider value labels
  massSlider.addEventListener('input', () => {
    massValueLabel.textContent = massSlider.value;
  });
  sizeSlider.addEventListener('input', () => {
    sizeValueLabel.textContent = sizeSlider.value;
  });

  // Planet selection changes gravity and background
  planetSelect.addEventListener('change', () => {
    const planet = planetSelect.value;
    engine.gravity.y = gravityByPlanet[planet] || 1;
    render.options.background = backgroundByPlanet[planet] || '#eef2f3';
    createTrampoline(); // recreate trampoline in case height changes
  });

  // Helper: create triangle body (equilateral)
  function createTriangle(x, y, size, options) {
    const path = `0 0 ${size} 0 ${size / 2} ${size * Math.sin(Math.PI / 3)}`;
    return Bodies.fromVertices(x, y, Matter.Vertices.fromPath(path), options, true);
  }

  // Add shape to world
  function addShape(type, x, y, size, mass) {
    let body;

    const options = {
      mass: mass,
      restitution: 0.8,
      friction: 0.1,
      frictionAir: 0.02,
      render: { fillStyle: '#3498db' },
    };

    switch (type) {
      case 'circle':
        body = Bodies.circle(x, y, size / 2, options);
        break;
      case 'square':
        body = Bodies.rectangle(x, y, size, size, options);
        break;
      case 'triangle':
        body = createTriangle(x, y, size, options);
        break;
      default:
        return;
    }

    Composite.add(world, body);
  }

  // Add shape buttons event
  document.querySelectorAll('.shape-controls button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const shape = btn.getAttribute('data-shape');
      const size = parseInt(sizeSlider.value);
      const mass = parseInt(massSlider.value);

      // Spawn near the top, random X
      const x = Math.random() * (window.innerWidth - size) + size / 2;
      const y = 50;

      addShape(shape, x, y, size, mass);
    });
  });

  // Mouse control to drag bodies
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false,
      },
    },
  });
  Composite.add(world, mouseConstraint);

  // Keep the mouse in sync with rendering
  render.mouse = mouse;
})();
