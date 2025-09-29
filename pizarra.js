// Configura tu Firebase
var firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_DOMINIO.firebaseapp.com",
  databaseURL: "https://TU_DOMINIO.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_BUCKET.appspot.com",
  messagingSenderId: "ID",
  appId: "ID"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let drawing = false;
let color = "black";

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  ctx.beginPath();
});

canvas.addEventListener("mousemove", draw);

function draw(e) {
  if (!drawing) return;

  const x = e.offsetX;
  const y = e.offsetY;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);

  db.ref("drawings").push({
    x, y, color
  });
}

// Dibujar trazos de otros usuarios
db.ref("drawings").on("child_added", (data) => {
  const { x, y, color: c } = data.val();
  ctx.strokeStyle = c;
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

function setColor(c) {
  color = c;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  db.ref("drawings").remove();
}
