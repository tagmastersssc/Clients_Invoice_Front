const debugModule = require('debug');

if (typeof debugModule !== 'function') {
  throw new TypeError('_debug(...) is not a function');
}

debugModule.enable('frontend:*');
const log = debugModule('frontend:dev');
log.log = console.log.bind(console);
log('Servidor de desarrollo listo.');
console.log('El módulo debug se resolvió como una función CommonJS.');