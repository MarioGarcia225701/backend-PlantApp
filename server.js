const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Importar cors
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Permitir solicitudes desde cualquier origen
app.use(express.json());



// Rutas
const filePathU = path.join(__dirname, 'users.txt');
// Ruta del archivo posts.txt
const filePathF = path.join(__dirname, 'posts.txt');
// Ruta del archivo profiles.txt
const filePathP = path.join(__dirname, 'profiles.txt');
// Ruta del archivo logins.txt
const filePathL = path.join(__dirname, 'logins.txt');

// Función para leer y procesar los datos del archivo
function parsePostsFile(filePathF) {
  const fileContent = fs.readFileSync(filePathF, 'utf-8');
  const posts = [];

  // Dividir el contenido por "-----------------------------------------------"
  const records = fileContent.split('-----------------------------------------------');

  // Procesar cada registro
  records.forEach((record) => {
    const lines = record.trim().split('\n');
    if (lines.length > 1) {
      const post = {};
      lines.forEach((line) => {
        const [key, value] = line.split(': ', 2);
        if (key && value) {
          // Mapear las claves a nombres consistentes
          switch (key.trim().toLowerCase()) {
            case 'usuario':
              post.username = value.trim();
              break;
            case 'imagen':
              post.image = value.trim();
              break;
            case 'nombre científico':
              post.scientificName = value.trim();
              break;
            case 'nombre común':
              post.commonName = value.trim();
              break;
            case 'imagen similar':
              post.similarImage = value.trim();
              break;
            case 'descripción':
              post.description = value.trim();
              break;
            case 'referencia':
              post.reference = value.trim();
              break;
          }
        }
      });
      posts.push(post);
    }
  });

  return posts;
}


app.get('/api/profile/:username', (req, res) => {
  const username = req.params.username;

  // Leer y parsear el archivo profiles.txt
  const profiles = JSON.parse(fs.readFileSync('profiles.txt', 'utf-8'));

  // Buscar el usuario por username
  const profile = profiles.find(user => user.username === username);

  if (profile) {
    res.json(profile);
  } else {
    res.status(404).send('Perfil no encontrado');
  }
});

// Endpoint para obtener los posts
app.get('/api/posts', (req, res) => {
  try {
    const posts = parsePostsFile(filePathF);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer el archivo de posts' });
  }
});


app.post('/registerUser', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({message: 'Usuario o contraseña no proporcionados.'});
  }

  // Leer el archivo
  const users = fs.existsSync(filePathU) ? JSON.parse(fs.readFileSync(filePathU, 'utf-8')) : [];

  // Buscar si el usuario ya existe
  if (users.some(user => user.username === username)) {
    return res.status(409).json({ message: 'El usuario ya está registrado.' });
  }

  // Agregar el nuevo usuario
  users.push({ username, password });
  fs.writeFileSync(filePathU, JSON.stringify(users, null, 2));

  res.status(201).json({ message: 'Usuario registrado con éxito.' });
});

app.post('/registerProfile', (req, res) => {
  const { fullname, email, username, password } = req.body;

  if (!fullname || !email || !username || !password) {
    return res.status(400).json({message: 'Usuario o contraseña no proporcionados.'});
  }

  // Leer el archivo
  const profiles = fs.existsSync(filePathP) ? JSON.parse(fs.readFileSync(filePathP, 'utf-8')) : [];

  // Buscar si el usuario ya existe
  if (profiles.some(profile => profile.username === username)) {
    return res.status(409).json({ message: 'El usuario ya está registrado.' });
  }

  // Agregar el nuevo usuario
  profiles.push({ fullname, email, username, password });
  fs.writeFileSync(filePathP, JSON.stringify(profiles, null, 2));

  res.status(201).json({ message: 'Usuario registrado con éxito.' });
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  //console.log('Datos recibidos:', req.body);


  if (!username || !password) {
    return res.status(400).json({message: 'Usuario o contraseña no proporcionados.'});
  }

  const users = fs.existsSync(filePathU) ? JSON.parse(fs.readFileSync(filePathU, 'utf-8')) : [];
  //console.log('Usuarios en el archivo:', users);
  const user = users.find(user => user.username === username && user.password === password);

  if (!user) {
    return res.status(401).json({message:'Credenciales inválidas.'});
  }

  res.json({message:'Inicio de sesión exitoso.'});
});


// Endpoint para identificar planta
app.post('/api/identify', async (req, res) => {
  const { images, plant_language, modifiers, include_images } = req.body;

 

  try {
      const response = await axios.post(
          'https://plant.id/api/v3/identification?details=common_names,url,description,taxonomy',
          {
              images,
              "latitude": 49.207,
              "longitude": 16.608,
              "similar_images": true,
              

          },
          {
              headers: {
                  'Api-Key': 'iJk5peZrwQgxFIgqljqYbxlxsAxUf1sRb023CHyApbTyZiZMLz',
                  'Content-Type': 'application/json',
              },
          }
      );
      res.json(response.data);
  } catch (error) {
    console.error('Error al identificar la planta:', error.response?.data || error.message);
    res.status(error.response?.status || 500).send(error.response?.data || error.message);
}
});

app.post('/post-plant', (req, res) => {
  const plantData = req.body;

  const formattedData = `
Usuario: ${plantData.username}
Imagen: ${plantData.imageUrl}
Nombre científico: ${plantData.scientificName}
Nombre común: ${plantData.commonName}
Imagen Similar: ${plantData.similarImages}
Descripción: ${plantData.description}
Referencia: ${plantData.referenceUrl}
-----------------------------------------------
`;

  // Leer el contenido existente del archivo
  fs.readFile('posts.txt', 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') { // Permitir archivos que no existen aún
      console.error("Error al leer el archivo:", err);
      return res.status(500).json({ message: "Error al leer el archivo" });
    }

    // Combinar el nuevo contenido con el existente
    const updatedData = formattedData + (data || "");

    // Sobrescribir el archivo con el contenido actualizado
    fs.writeFile('posts.txt', updatedData, (err) => {
      if (err) {
        console.error("Error al guardar los datos:", err);
        return res.status(500).json({ message: "Error al guardar los datos" });
      }
      res.status(200).json({ message: "Datos guardados correctamente" });
    });
  });
});

app.post('/save-request', (req, res) => {
  const requestData = req.body;

  const formattedRequest = `
Usuario: ${requestData.username}
Imagen: ${requestData.imageUrl}
Nombre científico: ${requestData.scientificName}
Nombre común: ${requestData.commonName}
Imagen Similar: ${requestData.similarImages}
Descripción: ${requestData.description}
Referencia: ${requestData.referenceUrl}
-----------------------------------------------
`;

  // Agregar el nuevo registro al principio del archivo
  fs.readFile('requests.txt', 'utf-8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      console.error("Error al leer el archivo de historial:", err);
      return res.status(500).json({ message: "Error al leer el archivo" });
    }

    const updatedData = formattedRequest + (data || '');
    fs.writeFile('requests.txt', updatedData, (writeErr) => {
      if (writeErr) {
        console.error("Error al guardar el historial:", writeErr);
        return res.status(500).json({ message: "Error al guardar el historial" });
      }
      res.status(200).json({ message: "Historial guardado correctamente" });
    });
  });
});

app.post('/log-login', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username es requerido" });
  }

  // Leer el archivo profiles.txt
  fs.readFile('profiles.txt', 'utf-8', (err, data) => {
    if (err) {
      console.error("Error al leer profiles.txt:", err);
      return res.status(500).json({ message: "Error al leer profiles.txt" });
    }

    // Parsear el contenido del archivo como JSON
    let profiles;
    try {
      profiles = JSON.parse(data);
    } catch (parseErr) {
      console.error("Error al parsear profiles.txt:", parseErr);
      return res.status(500).json({ message: "Error al parsear profiles.txt" });
    }

    // Buscar el perfil correspondiente al username
    const userProfile = profiles.find(profile => profile.username === username);

    if (!userProfile) {
      return res.status(404).json({ message: "Usuario no encontrado en profiles.txt" });
    }

    const fullname = userProfile.fullname; // Nombre completo
    // Obtener la fecha y hora actual formateada
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES'); // Formato de fecha
    const formattedTime = now.toLocaleTimeString('es-ES', { hour12: false }); // Formato de hora 24 horas

    // Crear el nuevo registro
    const loginRecord = `
Usuario: ${username}
Nombre Completo: ${fullname}
Fecha y Hora: ${formattedDate} ${formattedTime}
-----------------------------------------------
`;

    // Leer el contenido actual de logins.txt
    fs.readFile('logins.txt', 'utf-8', (readErr, existingData) => {
      if (readErr && readErr.code !== 'ENOENT') { // Si el error no es que el archivo no existe
        console.error("Error al leer logins.txt:", readErr);
        return res.status(500).json({ message: "Error al leer logins.txt" });
      }

      // Combinar el nuevo registro al inicio del contenido existente
      const updatedData = loginRecord + (existingData || '');

      // Sobrescribir logins.txt con el contenido actualizado
      fs.writeFile('logins.txt', updatedData, (writeErr) => {
        if (writeErr) {
          console.error("Error al guardar en logins.txt:", writeErr);
          return res.status(500).json({ message: "Error al guardar en logins.txt" });
        }

        res.status(200).json({ message: "Login registrado correctamente" });
      });
    });
  });
});




app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
