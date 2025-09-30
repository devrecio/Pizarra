const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const container = document.getElementById("canvas-container");

const EXPAND_STEP = 100;

let tool = "brush", drawing = false, panning = false;
let brushSize = 5, brushColor = "#2563eb";
let startX = 0, startY = 0;
let panStartX = 0, panStartY = 0;
let history = [], redoStack = [];

// Para texto
const textInputBox = document.getElementById("textInputBox");
const textValue = document.getElementById("textValue");
let textPos = { x: 0, y: 0 };

// INIT
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 80;
saveHistory();

// TOOL SELECTION
document.querySelectorAll(".tool-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    tool = btn.dataset.tool;
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if(tool !== "text") hideTextInput();
  });
});

document.getElementById("colorPicker").onchange = e => brushColor = e.target.value;
document.getElementById("sizePicker").onchange = e => brushSize = parseInt(e.target.value);
document.getElementById("undoBtn").onclick = undo;
document.getElementById("redoBtn").onclick = redo;
document.getElementById("saveBtn").onclick = saveCanvas;
document.getElementById("fullscreenBtn").onclick = toggleFullscreen;

// CANVAS EVENTS
canvas.addEventListener("mousedown", (e) => {
  if(tool === "hand") {
    e.preventDefault();
    panning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    return;
  }
  if(tool === "text") {
    e.preventDefault();
    const { x, y } = getXY(e);
    showTextInput(x, y);
    return;
  }
  startDraw(e);
});
canvas.addEventListener("mousemove", (e) => {
  if(tool === "hand" && panning) {
    e.preventDefault();
    container.scrollLeft -= e.clientX - panStartX;
    container.scrollTop -= e.clientY - panStartY;
    panStartX = e.clientX;
    panStartY = e.clientY;
    return;
  }
  draw(e);
});
canvas.addEventListener("mouseup", (e) => {
  if(tool === "hand") e.preventDefault();
  drawing = false;
  panning = false;
});
canvas.addEventListener("mouseleave", () => {
  drawing = false;
  panning = false;
});

// Touch events
canvas.addEventListener("touchstart", (e) => {
  if(tool === "hand") {
    e.preventDefault();
    panning = true;
    const touch = e.touches[0];
    panStartX = touch.clientX;
    panStartY = touch.clientY;
    return;
  }
  if(tool === "text") {
    e.preventDefault();
    const { x, y } = getXY(e);
    showTextInput(x, y);
    return;
  }
  startDraw(e);
});
canvas.addEventListener("touchmove", (e) => {
  if(tool === "hand" && panning) {
    e.preventDefault();
    const touch = e.touches[0];
    container.scrollLeft -= touch.clientX - panStartX;
    container.scrollTop -= touch.clientY - panStartY;
    panStartX = touch.clientX;
    panStartY = touch.clientY;
    return;
  }
  draw(e);
});
canvas.addEventListener("touchend", () => {
  drawing = false;
  panning = false;
});

// UTILS
function getXY(e) {
  const rect = canvas.getBoundingClientRect();
  let x = (e.touches?.[0] || e).clientX - rect.left;
  let y = (e.touches?.[0] || e).clientY - rect.top;
  return { x, y };
}

// DRAW FUNCTIONS
function startDraw(e) {
  if(tool === "hand" || tool === "text") return;

  drawing = true;
  const { x, y } = getXY(e);
  startX = x;
  startY = y;

  if(tool === "brush" || tool === "eraser") saveHistory();
}

function draw(e) {
  if(!drawing || tool === "hand" || tool === "text") return;
  const { x, y } = getXY(e);

  if(tool === "brush") {
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
    startX = x;
    startY = y;
    expandCanvasIfNeeded(x, y);
  }

  if(tool === "eraser") {
    ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    expandCanvasIfNeeded(x, y);
  }
}

// TEXT INPUT FUNCIONES
function showTextInput(x, y) {
  textPos = { x, y };
  textInputBox.style.display = "block";
  textInputBox.style.left = (x + container.getBoundingClientRect().left) + "px";
  textInputBox.style.top = (y + container.getBoundingClientRect().top) + "px";
  textValue.value = "";
  textValue.focus();
}

function hideTextInput() {
  textInputBox.style.display = "none";
  textValue.value = "";
}

window.insertText = function() {
  const text = textValue.value.trim();
  if(text.length === 0) {
    hideTextInput();
    return;
  }
  
  saveHistory();

  ctx.fillStyle = brushColor;
  ctx.font = `${brushSize * 4}px sans-serif`;

  // Si el texto toca cerca del borde, expandir canvas
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = brushSize * 4; // aprox altura
  const margin = 20;

  let newWidth = canvas.width;
  let newHeight = canvas.height;

  if(textPos.x + textWidth + margin > canvas.width) {
    newWidth = canvas.width + EXPAND_STEP;
  }
  if(textPos.y + textHeight + margin > canvas.height) {
    newHeight = canvas.height + EXPAND_STEP;
  }
  if(newWidth !== canvas.width || newHeight !== canvas.height) {
    resizeCanvas(newWidth, newHeight);
  }

  ctx.fillText(text, textPos.x, textPos.y);

  hideTextInput();
};

// CANVAS RESIZE
function expandCanvasIfNeeded(x, y) {
  let expandRight = x >= canvas.width - 50;
  let expandDown = y >= canvas.height - 50;

  if(expandRight || expandDown) {
    const newWidth = expandRight ? canvas.width + EXPAND_STEP : canvas.width;
    const newHeight = expandDown ? canvas.height + EXPAND_STEP : canvas.height;
    resizeCanvas(newWidth, newHeight);
    if(expandRight) container.scrollLeft += EXPAND_STEP;
    if(expandDown) container.scrollTop += EXPAND_STEP;
  }
}

function resizeCanvas(newWidth, newHeight) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0);

  canvas.width = newWidth;
  canvas.height = newHeight;

  ctx.drawImage(tempCanvas, 0, 0);
}

// HISTORY
function saveHistory() {
  if(history.length >= 50) history.shift();
  history.push(canvas.toDataURL());
  redoStack = [];
}

function undo() {
  if(!history.length) return;
  redoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = history.pop();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function redo() {
  if(!redoStack.length) return;
  history.push(canvas.toDataURL());
  const img = new Image();
  img.src = redoStack.pop();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

// SAVE
function saveCanvas() {
  const link = document.createElement("a");
  link.download = "pizarra.png";
  link.href = canvas.toDataURL();
  link.click();
}

// FULLSCREEN
function toggleFullscreen() {
  if(!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen?.();
  }
}
// Evita que tocar el input mueva la pantalla
textInputBox.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
textInputBox.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
textInputBox.addEventListener('touchend', (e) => e.stopPropagation(), { passive: false });

// También evita scroll general en mobile mientras usas canvas
document.body.addEventListener("touchmove", function (e) {
  if (tool !== "hand") {
    e.preventDefault();
  }
}, { passive: false });


