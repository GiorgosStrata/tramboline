// Module pattern to keep global namespace clean
(() => {
  const { Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint, Vector } = Matter;

  // Setup engine and world
  const engine = Engine.create();
  const world = engine.world;

  // Initial gravity for Earth
  const gravityByPlanet = {
    earth: 1,
    moon: 0.165,
    jupiter: 2.528,
  };

  engine.gravity.y = gravityByPlanet.earth;

  // Setup canvas and renderer
  const canvas = document.getElementById('world');
  const render = Render.create({
    canvas,
    engine,
    options: {
      wireframes: false,
      background: 'transparent',
      width: window.innerWidth,
      height: window.innerHeight - document.querySelector('.ui').offsetHeight,
      pixelRatio: window.devicePixelRatio,
    },
  });

  Render.run(render);

  const runner = Runner.create();
  Runner.run(runner, engine);

  // Resize canvas on window resize
  window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight - document.querySelector('.ui').offsetHeight;
    Render.lookAt(render, Composite.allBodies(world));
  });

  // Trampoline parameters
  const trampolineWidth = window.innerWidth * 0.6;
  const trampolineHeight = 20;
  const trampolineY = render.canvas.height - trampolineHeight * 2;

  // Create trampoline surface as a soft body using constraints (approximate)
  // We'll create a chain of small rectangles linked by springs (constraints)

  const trampolineSegments = 15;
  const segmentWidth = trampolineWidth / trampolineSegments;
  const trampolineBodies = [];
  const trampolineConstraints = [];

  // Create trampoline base (fixed)
  const trampolineBase = Bodies.rectangle(
    window.innerWidth / 2,
    trampolineY + trampolineHeight / 2,
    trampolineWidth,
    trampolineHeight,
    { isStatic: true, render: { fillStyle: '#27ae60' } }
  );
  Composite.add(world, trampolineBase);

  // Create trampoline elastic segments (small rectangles)
  for (let i = 0; i <= trampolineSegments; i++) {
    const segment = Bodies.rectangle(
      window.innerWidth / 2 - trampolineWidth / 2 + i * segmentWidth,
      trampolineY,
      segmentWidth - 2,
      10,
      {
        chamfer: 5,
        collisionFilter: { group: -1 },
        render: { fillStyle: '#2ecc71' },
        mass: 0.5,
        friction: 0,
        frictionAir: 0.02,
        restitution: 0.9,
      }
    );
    trampolineBodies.push(segment);
  }

  Composite.add(world, trampolineBodies);

  // Add constraints (springs) between segments to simulate elasticity
  for (let i = 0; i < trampolineSegments; i++) {
    const constraint = Matter.Constraint.create({
      bodyA: trampolineBodies[i],
      bodyB: trampolineBodies[i + 1],
      stiffness: 0.5,
      damping: 0.1,
      length: segmentWidth,
      render: {
        strokeStyle: '#27ae60',
      },
    });
    trampolineConstraints.push(constraint);
  }

  Composite.add(world, trampolineConstraints);

  // Anchor left and right ends to fixed points to simulate anchored trampoline
  const leftAnchor = Matter.Constraint.create({
    pointA: {
      x: window.innerWidth / 2 - trampolineWidth / 2,
      y: trampolineY,
    },
    bodyB: trampolineBodies[0],
    pointB: { x: 0, y: 0 },
    stiffness: 1,
    damping: 0.1,
  });

  const rightAnchor = Matter.Constraint.create({
    pointA: {
      x: window.innerWidth / 2 + trampolineWidth / 2,
      y: trampolineY,
    },
    bodyB: trampolineBodies[trampolineSegments],
    pointB: { x: 0, y: 0 },
    stiffness: 1,
    damping: 0.1,
  });

  Composite.add(world, [leftAnchor, rightAnchor]);

  // UI elements
  const planetSelect = document.getElementById('planet-select');
  const massSlider = document.getElementById('mass-slider');
  const sizeSlider = document.getElementById('size-slider');
  const massValueLabel = document.getElementById('mass-value');
  const sizeValueLabel = document.getElementById('size-value');

  massSlider.addEventListener('input', () => {
    massValueLabel.textContent = massSlider.value;
  });

  sizeSlider.addEventListener('input', () => {
    sizeValueLabel.textContent = sizeSlider.value;
  });

  planetSelect.addEventListener('change', () => {
    const planet = planetSelect.value;
    engine.gravity.y = gravityByPlanet[planet];
  });

  // Helper function: create triangle body (equilateral)
  function createTriangle(x, y, size, options) {
    const path = `0 0 ${size} 0 ${size / 2} ${size * Math.sin(Math.PI / 3)}`;
    return Bodies.fromVertices(x, y, Matter.Vertices.fromPath(path), options, true);
  }

  // Add shape function
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

  // Add shape buttons handler
  document.querySelectorAll('.shape-controls button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const shape = btn.getAttribute('data-shape');
      const size = parseInt(sizeSlider.value);
      const mass = parseInt(massSlider.value);

      // Spawn shape at random x near top of canvas
      const x = Math.random() * (window.innerWidth - size) + size / 2;
      const y = 50;

      addShape(shape, x, y, size, mass);
    });
  });

  // Add mouse control for fun (drag and throw shapes)
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

  render.mouse = mouse;

})();
