

let ledIds = [];
let buttonIds = [];
let triggers = {};
const componentCounter = { button: 1, led: 1 };

// Make component draggable for mouse and touch

function checkOverlap(draggedEl) {
  const all = document.querySelectorAll('.component');
  const rect1 = draggedEl.getBoundingClientRect();

  for (let el of all) {
    if (el === draggedEl) continue;
    const rect2 = el.getBoundingClientRect();

    const overlap = !(rect1.right <= rect2.left ||
                      rect1.left >= rect2.right ||
                      rect1.bottom <= rect2.top ||
                      rect1.top >= rect2.bottom);

    if (overlap) return true;
  }
  return false;
}

function makeDraggable(el) {
  let offsetX, offsetY, lastValidX, lastValidY;
  let isDragging = false;
  let startX, startY;

  const startDrag = (e) => {
    e.preventDefault();
    const isTouch = e.type === 'touchstart';
    const pos = isTouch ? e.touches[0] : e;
    startX = pos.clientX;
    startY = pos.clientY;
    offsetX = pos.clientX - el.offsetLeft;
    offsetY = pos.clientY - el.offsetTop;
    isDragging = false;

    lastValidX = el.offsetLeft;
    lastValidY = el.offsetTop;

    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag, { passive: false });
    document.addEventListener(isTouch ? 'touchend' : 'mouseup', drop);
  };

  const drag = (e) => {
    e.preventDefault();
    const isTouch = e.type === 'touchmove';
    const pos = isTouch ? e.touches[0] : e;

    const dx = pos.clientX - startX;
    const dy = pos.clientY - startY;
    if (!isDragging && Math.sqrt(dx * dx + dy * dy) > 10) {
      isDragging = true;
    }

    if (!isDragging) return;

    const designArea = document.getElementById('designArea');
    const palette = document.getElementById('palette');
    const designRect = designArea.getBoundingClientRect();
    const paletteRight = palette ? palette.getBoundingClientRect().right : 0;

    let newX = pos.clientX - offsetX;
    let newY = pos.clientY - offsetY;

    const minX = paletteRight - designRect.left + 10;
    const minY = 10;

    newX = Math.max(minX, newX);
    newY = Math.max(minY, newY);

    el.style.left = newX + 'px';
    el.style.top = newY + 'px';

    if (checkOverlap(el)) {
      el.style.left = lastValidX + 'px';
      el.style.top = lastValidY + 'px';
    } else {
      lastValidX = newX;
      lastValidY = newY;
    }
  };

  const drop = (e) => {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', drop);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', drop);

    if (!isDragging && el.tagName === 'BUTTON') {
      el.click(); // Simulate real tap
    }

    checkTrash(el);
  };

  el.addEventListener('mousedown', startDrag);
  el.addEventListener('touchstart', startDrag, { passive: false });
}




// Add a component (button or led) to design area
function addComponent(type) {
  const designArea = document.getElementById('designArea');

  if (type === 'button') {
    const id = `Button${componentCounter.button++}`;
    const btn = document.createElement('button');
    btn.textContent = id;
    btn.className = 'component';
    btn.id = id;
    btn.style.left = '10px';
    btn.style.top = '60px';
    btn.onclick = () => triggerButton(id);
    makeDraggable(btn);
    designArea.appendChild(btn);
    buttonIds.push(id);
  }

  if (type === 'led') {
    const id = `LED${componentCounter.led++}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'component';
    wrapper.id = id + '_wrapper';
    wrapper.style.left = '10px';
    wrapper.style.top = '60px';

    const led = document.createElement('div');
    led.className = 'led';
    led.id = id;

    const label = document.createElement('span');
    label.textContent = id;

    wrapper.appendChild(led);
    wrapper.appendChild(label);
    makeDraggable(wrapper);
    designArea.appendChild(wrapper);
    ledIds.push(id);
    
  }

  refreshDropdowns();
  loadTriggers();

}

function isOverlapping(el1, el2) {
  const r1 = el1.getBoundingClientRect();
  const r2 = el2.getBoundingClientRect();
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

// Check if dropped on trash bin to delete component
function checkTrash(el) {
  const bin = document.getElementById('trashBin');
  const rect1 = el.getBoundingClientRect();
  const rect2 = bin.getBoundingClientRect();

  const overlap = !(rect1.right < rect2.left ||
                    rect1.left > rect2.right ||
                    rect1.bottom < rect2.top ||
                    rect1.top > rect2.bottom);

  if (overlap) {
    removeComponent(el);
  }
}

function getNonOverlappingPosition(newEl, designArea) {
  const components = designArea.querySelectorAll('.component');
  let x = 10, y = 10;
  newEl.style.position = 'absolute';
  newEl.style.left = x + 'px';
  newEl.style.top = y + 'px';
  designArea.appendChild(newEl); // Temporarily add

  while ([...components].some(c => isOverlapping(newEl, c))) {
    x += 20;
    y += 20;
    newEl.style.left = x + 'px';
    newEl.style.top = y + 'px';
  }

  return { x, y };
}


// Remove component and related blocks
function removeComponent(el) {
  const id = el.id.replace('_wrapper', '');
  buttonIds = buttonIds.filter(b => b !== id);
  ledIds = ledIds.filter(l => l !== id);
  el.remove();
  removeRelatedBlocks(id);
  refreshDropdowns();
}

// Blockly block definitions
function defineBlocks() {
  Blockly.defineBlocksWithJsonArray([
    {
      "type": "delay",
      "message0": "Wait %1 ms",
      "args0": [{ "type": "field_number", "name": "TIME", "value": 500 }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": 65
    }
  ]);

  Blockly.Blocks['led_on'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Turn ON")
        .appendField(new Blockly.FieldDropdown(() =>
          ledIds.length ? ledIds.map(id => [id, id]) : [["None", "None"]]
        ), "LED_ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['led_off'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Turn OFF")
        .appendField(new Blockly.FieldDropdown(() =>
          ledIds.length ? ledIds.map(id => [id, id]) : [["None", "None"]]
        ), "LED_ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['on_button_click'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("When")
        .appendField(new Blockly.FieldDropdown(() =>
          buttonIds.length ? buttonIds.map(id => [id, id]) : [["None", "None"]]
        ), "BUTTON_ID")
        .appendField("clicked");
      this.appendStatementInput("DO").setCheck(null).appendField("do");
      this.setColour(20);
    }
  };
}
defineBlocks();

// Initialize Blockly workspace
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox')
});

workspace.addChangeListener(function(event) {
  if (event.type !== Blockly.Events.UI) {
    loadTriggers();
  }
});


// Refresh dropdowns in blocks when components change
function refreshDropdowns() {
  const xml = Blockly.Xml.workspaceToDom(workspace);
  Blockly.Events.disable();
  workspace.clear();
  defineBlocks();
  Blockly.Xml.domToWorkspace(xml, workspace);
  Blockly.Events.enable();
}

// Remove blocks related to deleted components
function removeRelatedBlocks(id) {
  const blocks = workspace.getAllBlocks(false);
  blocks.forEach(block => {
    if ((block.type === 'on_button_click' && block.getFieldValue('BUTTON_ID') === id) ||
        ((block.type === 'led_on' || block.type === 'led_off') && block.getFieldValue('LED_ID') === id)) {
      block.dispose(true);
    }
  });
}

// Evaluate blocks (simple evaluator for math_number blocks)
function evaluateBlock(block) {
  if (!block) return 0;
  switch (block.type) {
    case 'math_number':
      return Number(block.getFieldValue('NUM'));
    default:
      return 0;
  }
}

// Execute the blocks in a chain with async support for delay and repeat
async function runBlockChain(block) {
  let current = block;
  while (current) {
    switch (current.type) {
      case 'led_on': {
        const onId = current.getFieldValue('LED_ID');
        const elOn = document.getElementById(onId);
        if (elOn) elOn.style.backgroundColor = 'red';
        break;
      }

      case 'led_off': {
        const offId = current.getFieldValue('LED_ID');
        const elOff = document.getElementById(offId);
        if (elOff) elOff.style.backgroundColor = 'gray';
        break;
      }

      case 'delay': {
        const ms = Number(current.getFieldValue('TIME'));
        await new Promise(res => setTimeout(res, ms));
        break;
      }

      case 'controls_repeat_ext': {
        const timesBlock = current.getInputTargetBlock('TIMES');
        const times = evaluateBlock(timesBlock) || 0;
        const loopBody = current.getInputTargetBlock('DO');
        for (let i = 0; i < times; i++) {
          if (loopBody) {
            await runBlockChain(loopBody);
          }
        }
        break;
      }
    }
    current = current.getNextBlock();
  }
}



// Load triggers from Blockly workspace
function loadTriggers() {
  triggers = {};
  const topBlocks = workspace.getTopBlocks(true);
  topBlocks.forEach(block => {
    if (block.type === 'on_button_click') {
      const btnId = block.getFieldValue('BUTTON_ID');
      if (!triggers[btnId]) triggers[btnId] = [];
      const doBlock = block.getInputTargetBlock('DO');
      if (doBlock) triggers[btnId].push(doBlock);
    }
  });
}

function triggerButton(id) {
  if (triggers[id]) {
    triggers[id].forEach(async block => {
      await runBlockChain(block);
    });
  }
}

function showDesigner() {
  document.getElementById('designArea').classList.remove('hidden');
  document.getElementById('blockArea').classList.add('hidden');
  document.getElementById('palette').classList.remove('hidden');
}

function showBlocks() {
  document.getElementById('blockArea').classList.remove('hidden');
  document.getElementById('designArea').classList.add('hidden');
  document.getElementById('palette').classList.add('hidden');

  // Force Blockly to resize after becoming visible
  setTimeout(() => {
    Blockly.svgResize(workspace);
  }, 1);
}

window.addEventListener('DOMContentLoaded', showDesigner);




