const express = require('express');
const app = express();
const port = 3000;

// Middleware básico para que entiendas formato JSON
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡El backend de la Agencia de Viajes está corriendo en server.js!');
});

app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});