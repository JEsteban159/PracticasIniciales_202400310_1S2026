const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const mysql    = require('mysql2/promise');

const app    = express();
const PORT   = 3001;
const SECRET = 'clave_super_secreta_demo';

app.use(cors());
app.use(express.json());

// CONEXIÓN
const db = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: 'root',
  database: 'base_datos_in4_web'
});

// ─── MIDDLEWARE JWT ───
function verificarToken(req, res, next) {
  const auth  = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido' });
  }
}

// ============================================================
// AUTH
// ============================================================

// REGISTRO
app.post('/api/auth/registro', async (req, res) => {
  const { registro_academico, nombre_usuario, apellido_usuario, correo_usuario, contrasena } = req.body;

  try {
    const hash = await bcrypt.hash(contrasena, 10);

    await db.execute(
      `INSERT INTO usuario 
       (registro_academico, nombre_usuario, apellido_usuario, correo_usuario, contrasena_usuario) 
       VALUES (?,?,?,?,?)`,
      [registro_academico, nombre_usuario, apellido_usuario, correo_usuario, hash]
    );

    res.status(201).json({ mensaje: 'Usuario registrado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Usuario o correo ya existe' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { registro_academico, contrasena } = req.body;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM usuario WHERE registro_academico = ?',
      [registro_academico]
    );

    const usuario = rows[0];
    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valido = await bcrypt.compare(contrasena, usuario.contrasena_usuario);
    if (!valido) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: usuario.id_usuario, nombre: usuario.nombre_usuario },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ============================================================
// PUBLICACIONES
// ============================================================

// GET publicaciones
app.get('/api/publicaciones', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, u.nombre_usuario, u.apellido_usuario,
             COUNT(c.id_comentario) AS total_comentarios
      FROM publicacion p
      JOIN usuario u ON p.usuario_id_usuario = u.id_usuario
      LEFT JOIN comentario c ON c.publicacion_id_publicacion = p.id_publicacion
      GROUP BY p.id_publicacion
      ORDER BY p.fecha_publicacion DESC
    `);

    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

// CREAR publicación
app.post('/api/publicaciones', verificarToken, async (req, res) => {
  const { tipo_publicacion, id_referencia_publicacion, mensaje_publicacion } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO publicacion 
       (tipo_publicacion, id_referencia_publicacion, mensaje_publicacion, usuario_id_usuario) 
       VALUES (?,?,?,?)`,
      [tipo_publicacion, id_referencia_publicacion, mensaje_publicacion, req.usuario.id]
    );

    res.status(201).json({ id: result.insertId });
  } catch {
    res.status(500).json({ error: 'Error al crear publicación' });
  }
});

// ============================================================
// COMENTARIOS
// ============================================================

// GET comentarios
app.get('/api/publicaciones/:id/comentarios', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.*, u.nombre_usuario
      FROM comentario c
      JOIN usuario u ON c.usuario_id_usuario = u.id_usuario
      WHERE c.publicacion_id_publicacion = ?
      ORDER BY c.fecha_comentario ASC
    `, [req.params.id]);

    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// POST comentario
app.post('/api/publicaciones/:id/comentarios', verificarToken, async (req, res) => {
  const { mensaje_comentario } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO comentario 
       (usuario_id_usuario, publicacion_id_publicacion, mensaje_comentario) 
       VALUES (?,?,?)`,
      [req.usuario.id, req.params.id, mensaje_comentario]
    );

    res.status(201).json({ id: result.insertId });
  } catch {
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});

// ============================================================
// CATÁLOGOS
// ============================================================

app.get('/api/cursos', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM curso ORDER BY nombre_curso');
  res.json(rows);
});

app.get('/api/catedraticos', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM catedratico ORDER BY nombre_catedratico');
  res.json(rows);
});

// ============================================================

app.listen(PORT, () => {
  console.log(`🔥 Backend corriendo en http://localhost:${PORT}`);
});