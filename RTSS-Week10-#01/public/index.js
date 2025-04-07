import * as THREE from "three";
import { FirstPersonControls } from "./FirstPersonControls.js";

let scene, myRenderer, camera;
let frameCount = 0;
let controls;
let socket;

let players = {};
let myColor = getRandomColor();
let myBombCount = 0;
let bombs = {}; // Unified object

function setupMySocket() {
  socket = io();

  socket.on('connect', () => {
    console.log("Connected to server with socket ID:", socket.id);
  });

  socket.on('msg', onMsg);
  socket.on('bomb', onBomb);
  socket.on('bombHit', onBombHit);
  socket.on('scaleChange', (data) => {
    const sphere = players[data.id];
    if (sphere) {
      sphere.scale.set(data.scale, data.scale, data.scale);
    }
  });
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function onMsg(msg) {
  if (!players[msg.id]) {
    const geometry = new THREE.SphereGeometry(1.5, 16, 8);
    const material = new THREE.MeshBasicMaterial({ color: msg.color || "#00FF00" });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    players[msg.id] = sphere;
    players[msg.id].userColor = msg.color;
  }

  players[msg.id].position.set(msg.x, msg.y, msg.z);
}

function onBomb(bomb) {
  console.log("Bomb received:", bomb);

  const geometry = new THREE.ConeGeometry(1, 4, 8);
  const material = new THREE.MeshBasicMaterial({ color: bomb.color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(bomb.x, bomb.y, bomb.z);

  mesh.bombId = bomb.bombId;
  mesh.userColor = bomb.color;

  bombs[bomb.bombId] = mesh;
  scene.add(mesh);
}

function onBombHit(data) {
  console.log("bombHit broadcast received:", data);
  const bomb = bombs[data.bombId];
  if (bomb) {
    scene.remove(bomb);
    delete bombs[data.bombId];
  }
}

function onKeyDown(ev) {
  if (ev.key === "b" || ev.key === "B") {
    myBombCount++;
    const bombId = `${socket.id}_${myBombCount}`;
    const bomb = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      color: myColor,
      id: socket.id,
      bombCount: myBombCount,
      bombId: bombId
    };
    socket.emit("bomb", bomb);

    const mySphere = players[socket.id];
    if (mySphere) {
      const scaleFactor = 1 + myBombCount * 0.1;
      mySphere.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
      socket.emit('scaleChange', {
        id: socket.id,
        scale: scaleFactor
      });
    }
    
  }
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("rgb(20,20,20)");

  myRenderer = new THREE.WebGLRenderer();
  myRenderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(myRenderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(2, 2, 2);
  camera.lookAt(0, 0, 0);

  controls = new FirstPersonControls(scene, camera, myRenderer);
  scene.add(new THREE.GridHelper(100, 100));

  setupMySocket();
  window.addEventListener('keydown', onKeyDown);
  draw();
}

function draw() {
  controls.update();

  if (socket && socket.connected) {
    const myMessage = {
      id: socket.id,
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      color: myColor
    };
    socket.emit('msg', myMessage);
  }

  const myPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
  const mySphere = players[socket.id];

  if (mySphere) {
    Object.values(bombs).forEach((bomb) => {
      const bombPos = bomb.position.clone();
      const distance = myPos.distanceTo(bombPos);
  
      if (distance < 2.5 && bomb.userColor !== myColor) {
        const currentScale = mySphere.scale.x;
        const newScale = Math.max(currentScale - 0.1, 0.2);
        mySphere.scale.set(newScale, newScale, newScale);

        socket.emit('bombHit', { bombId: bomb.bombId });
        
        // ✨ Inform the server about this new scale
        socket.emit('scaleChange', {
          id: socket.id,
          scale: newScale
        });
      }
    });
  }

  frameCount++;
  window.requestAnimationFrame(draw);
  myRenderer.render(scene, camera);
}

init();

