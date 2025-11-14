const CONFIG = {
  // Configuración de la física
  GRAVITY: 0.35,
  JUMP_POWER: -8,
  PLAYER_SPEED: 2.2,
  
  // Dimensiones del jugador
  PLAYER_WIDTH: 28,
  PLAYER_HEIGHT: 36,
  PLAYER_COLOR: '#ff0066',

  // Colores
  PLATFORM_COLOR: '#6b3e00',
  OTHER_PLAYER_COLOR: '#00aaff'
};

// Plataformas (x, y, w, h)
const PLATFORMS = [
  {x:0,y:480,w:960,h:60},
  {x:200,y:380,w:160,h:20},
  {x:420,y:320,w:120,h:20},
  {x:640,y:420,w:200,h:20}
];