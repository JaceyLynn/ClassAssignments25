// the express package will run our server
const express = require("express");
const app = express();
app.use(express.static("public")); // this line tells the express app to 'serve' the public folder to clients

// HTTP will expose our server to the web
const http = require("http").createServer(app);

// start our server listening on port 8080 for now (this is standard for HTTP connections)
const server = app.listen(8080);
console.log("Server is running on http://localhost:8080");

/////SOCKET.IO///////
// const io = require("socket.io")().listen(server);


const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("msg", (msg) => {
    io.emit("msg", msg);
  });

  socket.on("bomb", (bombData) => {
    console.log("Bomb dropped:", bombData.bombId);
    io.emit("bomb", bombData);
  });

  socket.on('bombHit', (data) => {
    console.log("bombHit received:", data);
    io.emit('bombHit', data); // broadcast to all clients
  });

  socket.on('scaleChange', (data) => {
    console.log(`Scale change from ${data.id}:`, data.scale);
    io.emit('scaleChange', data);
  });
});