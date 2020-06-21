
// Connection settings
const MAIN_NICK = '[BitcoinBot]';
const MY_NICK = process.env.BOTNAME || MAIN_NICK;
const IS_TESTNET = (MY_NICK !== MAIN_NICK);
const CHANN_NAME = process.env.CHANN || (IS_TESTNET ? 'Larp Lagoon' : 'Larp Lagoon');
const CHANN_ID_FALLBACK = process.env.CHANN_ID_FALLBACK || 17;
const MUMBLE_HOST = process.env.MUMBLE_HOST || 'bitcoinenemies.com';
// Auth
const AUTH_KEY = '';
const AUTH_CERT = '';

// Bot access
const ADMINS = [
  'raw',
  '_GIBUS_',
  'satwhale',
  'richard',
  'BITPAINT',
  'Bas',
  'mosats',
  'bitcoinenemies',
];

// Player settings
const MAX_VOL = 0.3;
const MIN_VOL = 0.01;
const DEFAULT_VOL = 0.02;


module.exports = {
  MAIN_NICK,
  MY_NICK,
  IS_TESTNET,
  CHANN_NAME,
  CHANN_ID_FALLBACK,
  AUTH_KEY,
  AUTH_CERT,
  MUMBLE_HOST,
  ADMINS,
  MAX_VOL,
  MIN_VOL,
  DEFAULT_VOL,
};
