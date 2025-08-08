(() => {
  const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Vertices } = Matter;

  // Planet data: gravity & background gradient
  const planetData = {
    earth: {
      gravity: 1,
      background: 'linear-gradient(to bottom, #87ceeb 0%, #1e3c72 100%)',
    },
    moon: {
      gravity: 0.165,
      background: 'linear-gradient(to bottom, #999999 0%, #222222 100%)',
    },
    jupiter: {
      gravity: 2.528,
      background: 'linear-gradient(to bottom, #d4af37 0%, #7b5100 100%)',
    },
  };

  // Setup Matter.js engine and world
  const engine = Engine.create();
  engine.gravity.y = planetData.earth.gravity;
  const world = engine.world;

  // Canvas & renderer setup
  const canvas = document.getElementById('world');
  const uiHeight = document.querySelector('.ui').offsetHeight;

  const render = Render.create({
    canvas,
    engine,
    options: {
      wireframes: false,
      background: planetData.earth.background,
      width: window.innerWidth,
      height: window.innerHeight - uiHeight,
      pixelRatio: window.devicePixelRatio,
    },
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // Update canvas size and trampoline on resize
  window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight - uiHeight;
    createTrampoline();
    Render.lookAt(render, Composite.allBodies(world));
  });

  // Trampoline & ground references
  let trampoline, ground;

  // Create trampoline: static rectangle centered, width = 50% screen, height fixed
  function createTrampoline() {
    const width = window.innerWidth * 0.5;
    const height = 22;
    const yPos = render.canvas.height - height - 10;

    // Remove old if present
    if (trampoline) Composite.remove(world, trampoline);
    if (ground) Composite.remove(world, ground);

    trampoline = Bodies.rectangle(
      window.innerWidth / 2,
      yPos,
      width,
      height,
      {
        isStatic: true,
        restitution: 1.2, // super bouncy
        friction: 0.1,
        frictionStatic: 0,
        frictionAir: 0,
        render: {
          fillStyle: '#27ae60',
          strokeStyle: '#145214',
          lineWidth: 3,
        },
      }
    );

    // Ground to catch shapes
    ground = Bodies.rectangle(
      window.innerWidth / 2,
      yPos + 50,
      window.innerWidth,
      60,
      {
        isStatic: true,
        restitution: 0,
        friction: 0.7,
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
  const shapeButtons = document.querySelectorAll('.shape-btn');

  // Selected shape & preview
  let selectedShape = 'circle';
  let isPlacing = false;
  let previewBody = null;

  // Update slider labels
  function updateLabels() {
    massValueLabel.textContent = massSlider.value;
    sizeValueLabel.textContent = sizeSlider.value;
  }
  updateLabels();

  // Update gravity & background on planet change
  planetSelect.addEventListener('change', e => {
    const p = e.target.value;
    if (!planetData[p]) return;
    engine.gravity.y = planetData[p].gravity;
    render.options.background = planetData[p].background;
    Render.lookAt(render, Composite.allBodies(world));
  });

  // Handle shape button selection highlight
  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedShape = btn.getAttribute('data-shape');
      shapeButtons.forEach(b => {
        b.classList.toggle('selected', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  // Update slider labels on input
  massSlider.addEventListener('input', updateLabels);
  sizeSlider.addEventListener('input', updateLabels);

  // Convert triangle vertices relative to center and size
  function createTriangleVertices(size) {
    const h = size * Math.sqrt(3) / 2;
    return [
      { x: 0, y: -h / 2 },
      { x: -size / 2, y: h / 2 },
      { x: size / 2, y: h / 2 },
    ];
  }

  // Create body factory based on shape type
  function createBody(x, y, shape, mass, size) {
    const options = {
      mass,
      restitution: 0.9,
      friction: 0.05,
      frictionAir: 0.01,
      render: { fillStyle: '#3498db' },
    };

    switch(shape) {
      case 'circle':
        return Bodies.circle(x, y, size / 2, options);
      case 'square':
        return Bodies.rectangle(x, y, size, size, options);
      case 'triangle':
        return Bodies.fromVertices(x, y, [createTriangleVertices(size)], options, true);
      default:
        return Bodies.circle(x, y, size / 2, options);
    }
  }

  // Mouse/touch interaction for placing shapes with preview

  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false },
    },
  });
  Composite.add(world, mouseConstraint);

  // Track if left mouse is down and preview position
  let mouseDown = false;
  let previewPos = null;

  // Show preview shape on mousemove when placing
  function updatePreview(pos) {
    if (!previewBody) {
      previewBody = createBody(pos.x, pos.y, selectedShape, +massSlider.value, +sizeSlider.value);
      previewBody.isSensor = true; // no collisions
      previewBody.render.fillStyle = 'rgba(52, 152, 219, 0.5)';
      Composite.add(world, previewBody);
    } else {
      Matter.Body.setPosition(previewBody, pos);
    }
  }

  // Remove preview shape
  function removePreview() {
    if (previewBody) {
      Composite.remove(world, previewBody);
      previewBody = null;
    }
  }

  // Mouse down: start placing (left button only)
  render.canvas.addEventListener('mousedown', e => {
    if (e.button === 0) { // Left click
      mouseDown = true;
      const pos = mouse.position;
      previewPos = pos;
      updatePreview(pos);
    }
  });

  // Mouse move: update preview position if placing
  render.canvas.addEventListener('mousemove', e => {
    if (mouseDown) {
      updatePreview(mouse.position);
    }
  });

  // Mouse up: finalize placement
  render.canvas.addEventListener('mouseup', e => {
    if (e.button === 0 && mouseDown) {
      mouseDown = false;
      if (previewBody) {
        // Remove preview and spawn real body at last position with mass and size
        const pos = previewBody.position;
        Composite.remove(world, previewBody);
        previewBody = null;

        const realBody = createBody(
          pos.x,
          pos.y,
          selectedShape,
          +massSlider.value,
          +sizeSlider.value
        );

        Composite.add(world, realBody);
      }
    }
  });

  // Right click cancels placement preview
  render.canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (previewBody) {
      removePreview();
      mouseDown = false;
    }
  });

  // Touch events for mobile support
  render.canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      mouseDown = true;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const pos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      updatePreview(pos);
    }
  }, { passive: false });

  render.canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (mouseDown && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const pos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      updatePreview(pos);
    }
  }, { passive: false });

  render.canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (mouseDown) {
      mouseDown = false;
      if (previewBody) {
        const pos = previewBody.position;
        Composite.remove(world, previewBody);
        previewBody = null;

        const realBody = createBody(
          pos.x,
          pos.y,
          selectedShape,
          +massSlider.value,
          +sizeSlider.value
        );

        Composite.add(world, realBody);
      }
    }
  }, { passive: false });

  // Make sure canvas size is set initially
  function resize() {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight - uiHeight;
    createTrampoline();
    Render.lookAt(render, Composite.allBodies(world));
  }
  resize();

})();
