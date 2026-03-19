CREATE DATABASE IF NOT EXISTS base_datos_in4_web;
USE base_datos_in4_web;

-- TABLA USUARIO ---------------------------------------------------------
CREATE TABLE usuario 
( 
    id_usuario INT AUTO_INCREMENT PRIMARY KEY, 
    registro_academico CHAR(9) NOT NULL UNIQUE, 
    nombre_usuario VARCHAR(50) NOT NULL, 
    apellido_usuario VARCHAR(50) NOT NULL, 
    correo_usuario VARCHAR(100) NOT NULL UNIQUE, 
    contrasena_usuario VARCHAR(100) NOT NULL
);

-- TABLA CATEDRATICO -------------------------------------------------
CREATE TABLE catedratico  
( 
    id_catedratico INT AUTO_INCREMENT PRIMARY KEY, 
    nombre_catedratico VARCHAR(50) NOT NULL, 
    apellido_catedratico VARCHAR(50) NOT NULL, 
    correo_catedratico VARCHAR(100) UNIQUE
);

-- TABLA CURSO ---------------------------------------------------------
CREATE TABLE curso 
( 
    id_curso INT AUTO_INCREMENT PRIMARY KEY, 
    nombre_curso VARCHAR(50) NOT NULL, 
    creditos_curso INT NOT NULL DEFAULT 5, 
    area_curso ENUM('N/A', 'metodología de sistemas','desarrollo de software','ciencias de la computacion') NOT NULL 
);

-- TABLA PUBLICACION ----------------------------------------------------
CREATE TABLE publicacion 
( 
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY, 
    mensaje_publicacion VARCHAR(500) NOT NULL, 
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    tipo_publicacion ENUM('curso','catedratico') NOT NULL,
    id_referencia_publicacion INT NOT NULL, -- id del curso o catedratico
    usuario_id_usuario INT NOT NULL, 
    
    FOREIGN KEY (usuario_id_usuario) REFERENCES usuario(id_usuario)
);

-- TABLA COMENTARIO ---------------------------------------------------
CREATE TABLE comentario 
( 
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id_usuario INT NOT NULL, 
    publicacion_id_publicacion INT NOT NULL, 
    mensaje_comentario VARCHAR(500) NOT NULL, 
    fecha_comentario DATE NOT NULL DEFAULT (CURRENT_DATE),
    
    FOREIGN KEY (usuario_id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (publicacion_id_publicacion) REFERENCES publicacion(id_publicacion)
);

-- TABLA CURSO APROBADO -------------------------------------------------
CREATE TABLE curso_aprobado 
( 
    id_registro INT AUTO_INCREMENT PRIMARY KEY, 
    fecha_aprobacion DATE NOT NULL DEFAULT (CURRENT_DATE), 
    usuario_id_usuario INT NOT NULL, 
    curso_id_curso INT NOT NULL,
    
    UNIQUE (usuario_id_usuario, curso_id_curso),
    
    FOREIGN KEY (usuario_id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (curso_id_curso) REFERENCES curso(id_curso)
);

-- -------------------- DATOS DE PRUEBA --------------------

-- Cursos
INSERT INTO curso (nombre_curso, creditos_curso, area_curso) VALUES
('Análisis y Diseño de Sistemas 1', 6, 'desarrollo de software'),
('Sistemas de Bases de Datos 1', 6, 'desarrollo de software'),
('Inteligencia Artificial 1', 7, 'ciencias de la computacion'),
('Lógica de Sistemas', 3, 'metodología de sistemas'),
('Introducción a la Programación y Computación 1', 6, 'desarrollo de software');

-- Catedráticos
INSERT INTO catedratico (nombre_catedratico, apellido_catedratico, correo_catedratico) VALUES
('Juan', 'Martínez', 'juanmartinez@gmail.com'),
('Adolfo', 'Jimenez', 'adolfojimenez@gmail.com'),
('Estuardo', 'Larrañaga', 'estuardolarrañaga@gmail.com'),
('Maria', 'de Leon', 'mariadeleon@gmail.com'),
('Carla', 'Aguilar', 'carlaaguilar@gmail.com');

-- Usuarios (password: ca2026)
INSERT INTO usuario(registro_academico, nombre_usuario, apellido_usuario, correo_usuario, contrasena_usuario) VALUES
('202400273', 'Claudia', 'Monzón', 'claudiamonzon@gmail.com', 'ca2026'),
('202055203', 'Mario', 'Castañeda', 'mariocastañeda@gmail.com', 'ca2026'),
('202100130', 'Eufracio', 'López', 'eufraciolopez@gmail.com', 'ca2026'),
('201256878', 'Ana', 'Conda', 'anaconda@gmail.com', 'ca2026'),
('202415263', 'Angela', 'Asturias', 'angelaasturias@gmail.com', 'ca2026');

-- Publicaciones
INSERT INTO publicacion(usuario_id_usuario, tipo_publicacion, id_referencia_publicacion, mensaje_publicacion) VALUES
(1, 'curso', 1, 'Analisis y diseño de sistemas 1 es un curso muy complicado.'),
(2, 'catedratico', 2, 'El ingeniero Adolfo Jimenez es muy bueno enseñando.'),
(3, 'catedratico', 3, 'El ingeniero Estuardo Larrañaga no explica bien.'),
(4, 'curso', 2, 'Sistemas de Bases de Datos 1 es el curso mas fácil de la carrera.'),
(5, 'curso', 4, 'Lógica de Sistemas es el primer curso del área profesional.');

-- Comentarios
INSERT INTO comentario(usuario_id_usuario, publicacion_id_publicacion, mensaje_comentario) VALUES
(5, 1, 'Es cierto, me tomó 3 intentos.'),
(4, 2, 'El mejor.'),
(2, 3, 'Eso es mentira, explica bien.'),
(3, 4, 'Mentira.'),
(1, 5, 'Es cierto.');

-- Cursos aprobados
INSERT INTO curso_aprobado(usuario_id_usuario, curso_id_curso) VALUES
(1,1),
(1,2),
(1,3),
(2,1),
(2,2),
(3,3),
(3,4),
(5,5),
(5,1),
(4,3);