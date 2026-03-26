const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3001;
const SECRET = 'clave_super_secreta_demo';

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'JE@sturiasO159',
  database: 'base_datos_in4_web'
});

function verificarToken(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido' });
  }
}

// registro------------------------------------------------------------------------------------------------------------------------
app.post('/api/auth/registro', async (req, res) => {
  const { registro_academico, nombre_usuario, apellido_usuario, correo_usuario, contrasena_usuario } = req.body;

  if (!registro_academico || !nombre_usuario || !apellido_usuario || !correo_usuario || !contrasena_usuario) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    const hash = await bcrypt.hash(contrasena_usuario, 10);

    await db.execute(
      `INSERT INTO usuario 
       (registro_academico, nombre_usuario, apellido_usuario, correo_usuario, contrasena_usuario) 
       VALUES (?,?,?,?,?)`,
      [registro_academico, nombre_usuario, apellido_usuario, correo_usuario, hash]
    );

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Registro académico o correo ya existe' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// inicio de sesion----------------------------------------------------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { registro_academico, contrasena_usuario } = req.body;

  if (!registro_academico || !contrasena_usuario) {
    return res.status(400).json({ error: 'Registro académico y contraseña requeridos' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM usuario WHERE registro_academico = ?',
      [registro_academico]
    );

    const usuario = rows[0];
    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valido = await bcrypt.compare(contrasena_usuario, usuario.contrasena_usuario);
    if (!valido) return res.status(401).json({ error: 'Credenciales incorrectas' });


    const token = jwt.sign(
      { id: usuario.id_usuario, nombre: usuario.nombre_usuario, registro: usuario.registro_academico },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      token, 
      usuario: { 
        id: usuario.id_usuario, 
        nombre: usuario.nombre_usuario, 
        apellido: usuario.apellido_usuario,
        registro: usuario.registro_academico,
        correo: usuario.correo_usuario
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener todas las publicaciones-------------------------------------------------------------------------------------------------
app.get('/api/publicaciones', verificarToken, async (req, res) => {
  const { tipo, referencia_id } = req.query;

  let query = `
    SELECT p.*, u.nombre_usuario, u.apellido_usuario, u.registro_academico,
           COUNT(c.id_comentario) AS total_comentarios
    FROM publicacion p
    JOIN usuario u ON p.usuario_id_usuario = u.id_usuario
    LEFT JOIN comentario c ON c.publicacion_id_publicacion = p.id_publicacion
  `;
  const params = [];

  if (tipo) {
    query += ' WHERE p.tipo_publicacion = ?';
    params.push(tipo);
    if (referencia_id) {
      query += ' AND p.id_referencia_publicacion = ?';
      params.push(referencia_id);
    }
  }

  query += ' GROUP BY p.id_publicacion ORDER BY p.fecha_publicacion DESC';

  try {
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

// Crear publicacion---------------------------------------------------------------------------------------------------------------
app.post('/api/publicaciones', verificarToken, async (req, res) => {
  const { tipo_publicacion, id_referencia_publicacion, mensaje_publicacion } = req.body;

  if (!tipo_publicacion || !id_referencia_publicacion || !mensaje_publicacion) {
    return res.status(400).json({ error: 'tipo_publicacion, id_referencia_publicacion y mensaje_publicacion son requeridos' });
  }

  if (!['curso', 'catedratico'].includes(tipo_publicacion)) {
    return res.status(400).json({ error: 'tipo_publicacion debe ser "curso" o "catedratico"' });
  }

  try {
    if (tipo_publicacion === 'curso') {
      const [curso] = await db.execute('SELECT id_curso FROM curso WHERE id_curso = ?', [id_referencia_publicacion]);
      if (curso.length === 0) {
        return res.status(404).json({ error: 'El curso no existe' });
      }
    } else {
      const [catedratico] = await db.execute('SELECT id_catedratico FROM catedratico WHERE id_catedratico = ?', [id_referencia_publicacion]);
      if (catedratico.length === 0) {
        return res.status(404).json({ error: 'El catedrático no existe' });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO publicacion 
       (tipo_publicacion, id_referencia_publicacion, mensaje_publicacion, usuario_id_usuario) 
       VALUES (?,?,?,?)`,
      [tipo_publicacion, id_referencia_publicacion, mensaje_publicacion, req.usuario.id]
    );

    res.status(201).json({ id: result.insertId, mensaje: 'Publicación creada exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear publicación' });
  }
});

// obterner comentarios de una publicacion-----------------------------------------------------------------------------------------
app.get('/api/publicaciones/:id/comentarios', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.*, u.nombre_usuario, u.apellido_usuario
       FROM comentario c
       JOIN usuario u ON c.usuario_id_usuario = u.id_usuario
       WHERE c.publicacion_id_publicacion = ?
       ORDER BY c.fecha_comentario ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// agregar comentario -------------------------------------------------------------------------------------------------------------
app.post('/api/publicaciones/:id/comentarios', verificarToken, async (req, res) => {
  const { mensaje_comentario } = req.body;

  if (!mensaje_comentario || mensaje_comentario.trim() === '') {
    return res.status(400).json({ error: 'El mensaje del comentario es requerido' });
  }

  try {
    const [publicacion] = await db.execute('SELECT id_publicacion FROM publicacion WHERE id_publicacion = ?', [req.params.id]);
    if (publicacion.length === 0) {
      return res.status(404).json({ error: 'La publicación no existe' });
    }

    const [result] = await db.execute(
      `INSERT INTO comentario 
       (usuario_id_usuario, publicacion_id_publicacion, mensaje_comentario) 
       VALUES (?,?,?)`,
      [req.usuario.id, req.params.id, mensaje_comentario]
    );

    res.status(201).json({ id: result.insertId, mensaje: 'Comentario agregado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});

// obtener todos los cursos -------------------------------------------------------------------------------------------------------
app.get('/api/cursos', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM curso ORDER BY nombre_curso');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

// Obtener todos los catedráticos--------------------------------------------------------------------------------------------------
app.get('/api/catedraticos', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM catedratico ORDER BY nombre_catedratico');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener catedráticos' });
  }
});

// Buscar usuario por registro académico-------------------------------------------------------------------------------------------
app.get('/api/usuarios/buscar/:registro', verificarToken, async (req, res) => {
  const { registro } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT id_usuario, registro_academico, nombre_usuario, apellido_usuario, correo_usuario 
       FROM usuario 
       WHERE registro_academico = ?`,
      [registro]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar usuario' });
  }
});

// Ver perfil de usuarioVer perfil de usuario--------------------------------------------------------------------------------------
app.get('/api/usuarios/:id/perfil', verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT id_usuario, registro_academico, nombre_usuario, apellido_usuario, correo_usuario 
       FROM usuario 
       WHERE id_usuario = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const esPropio = (req.usuario.id == id);

    res.json({
      ...rows[0],
      esPropio
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Actualizar perfil propio--------------------------------------------------------------------------------------------------------
app.put('/api/usuarios/:id/perfil', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre_usuario, apellido_usuario, correo_usuario } = req.body;

  if (req.usuario.id != id) {
    return res.status(403).json({ error: 'No puedes modificar el perfil de otro usuario' });
  }

  if (!nombre_usuario || !apellido_usuario || !correo_usuario) {
    return res.status(400).json({ error: 'Nombre, apellido y correo son requeridos' });
  }

  try {
    await db.execute(
      `UPDATE usuario 
       SET nombre_usuario = ?, apellido_usuario = ?, correo_usuario = ? 
       WHERE id_usuario = ?`,
      [nombre_usuario, apellido_usuario, correo_usuario, id]
    );

    res.json({ mensaje: 'Perfil actualizado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El correo ya está en uso' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

//  Obtener cursos aprobados de un usuario-----------------------------------------------------------------------------------------
app.get('/api/usuarios/:id/cursos-aprobados', verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT ca.*, c.nombre_curso, c.creditos_curso, c.area_curso
       FROM curso_aprobado ca
       JOIN curso c ON ca.curso_id_curso = c.id_curso
       WHERE ca.usuario_id_usuario = ?
       ORDER BY ca.fecha_aprobacion DESC`,
      [id]
    );

    const totalCreditos = rows.reduce((sum, curso) => sum + curso.creditos_curso, 0);

    res.json({
      cursos: rows,
      totalCreditos
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cursos aprobados' });
  }
});

// Agregar curso aprobado ---------------------------------------------------------------------------------------------------------
app.post('/api/usuarios/:id/cursos-aprobados', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { curso_id } = req.body;

  if (req.usuario.id != id) {
    return res.status(403).json({ error: 'Solo puedes agregar cursos a tu propio perfil' });
  }

  if (!curso_id) {
    return res.status(400).json({ error: 'curso_id es requerido' });
  }

  try {
    const [curso] = await db.execute('SELECT id_curso FROM curso WHERE id_curso = ?', [curso_id]);
    if (curso.length === 0) {
      return res.status(404).json({ error: 'El curso no existe' });
    }

    await db.execute(
      `INSERT INTO curso_aprobado (usuario_id_usuario, curso_id_curso) 
       VALUES (?, ?)`,
      [id, curso_id]
    );

    res.status(201).json({ mensaje: 'Curso aprobado agregado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El curso ya está registrado como aprobado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al agregar curso aprobado' });
  }
});

// CAMBIAR CONTRASEÑA -------------------------------------------------------------------------------------------------------------
app.put('/api/usuarios/:id/cambiar-contrasena', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { contrasena_usuario } = req.body;

  if (!contrasena_usuario) {
    return res.status(400).json({ error: 'Nueva contraseña requerida' });
  }

  try {
    const hash = await bcrypt.hash(contrasena_usuario, 10);
    await db.execute(
      'UPDATE usuario SET contrasena_usuario = ? WHERE id_usuario = ?',
      [hash, id]
    );
    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

app.listen(PORT, () => {
  console.log(`   Backend corriendo en http://localhost:${PORT}`);
  console.log('   ===================================');
  console.log('   ENDPOINTS DISPONIBLES:');
  console.log('   AUTH:');
  console.log('   POST   /api/auth/registro');
  console.log('   POST   /api/auth/login');
  console.log('');
  console.log('   PUBLICACIONES:');
  console.log('   GET    /api/publicaciones?tipo=&referencia_id=');
  console.log('   POST   /api/publicaciones');
  console.log('   GET    /api/publicaciones/:id/comentarios');
  console.log('   POST   /api/publicaciones/:id/comentarios');
  console.log('');
  console.log('   CATÁLOGOS:');
  console.log('   GET    /api/cursos');
  console.log('   GET    /api/catedraticos');
  console.log('');
  console.log('   USUARIOS:');
  console.log('   GET    /api/usuarios/buscar/:registro');
  console.log('   GET    /api/usuarios/:id/perfil');
  console.log('   PUT    /api/usuarios/:id/perfil');
  console.log('   GET    /api/usuarios/:id/cursos-aprobados');
  console.log('   POST   /api/usuarios/:id/cursos-aprobados');
  console.log('   ===================================');
});