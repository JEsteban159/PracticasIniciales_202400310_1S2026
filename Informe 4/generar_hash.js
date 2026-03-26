const bcrypt = require('bcryptjs');

const password = 'ca2026';
const hash = bcrypt.hashSync(password, 10);

console.log('Contraseña original:', password);
console.log('Hash generado:', hash);