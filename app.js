const EventEmitter = require('events');
const fs = require('fs');
const mumble = require('mumble');
const striptags = require('striptags');
const fetch = require("node-fetch");

// Config options
let initConfig;
try {
  initConfig = require('./config.js');
} catch (e) {
  console.log('[ERROR] Create file config.js with your settings based on config.js.example');
  console.error(e);
  process.exit(1);
}
const CONFIG = initConfig;

const {
  ADMINS, MAIN_NICK, MY_NICK, CHANN_NAME, CHANN_ID_FALLBACK,
  MAX_VOL, MIN_VOL, DEFAULT_VOL, ACCESS_TOKENS,
} = CONFIG;

// State vars
var READY_TO_MSG = false;
var conn;
var chann = null;


// Process life handlers
function exitHandler(options, err) {
    if (chann) {
        chann.sendMessage('Bye!');
    }
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) {
	console.log('[exitHandler] exiting in 100ms', options);
        setTimeout(function() {
            process.exit();
        }, 100);
    }
}
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

/// HELPERS
function secsToDuration(secs) {
  var secNum = parseInt(secs, 10);
  var hours   = Math.floor(secNum / 3600);
  var minutes = Math.floor((secNum - (hours * 3600)) / 60);
  var seconds = secNum - (hours * 3600) - (minutes * 60);

  if (minutes < 10) {minutes = '0'+minutes;}
  if (seconds < 10) {seconds = '0'+seconds;}
  return hours+':'+minutes+':'+seconds;
}

function hasAccess(user) {
  if (!user.isRegistered()) {
    user.sendMessage('- Sorry, only registered users can control the bot');
    return false;
  }
  return true;
}

function hasAdminAccess(user) {
  if (!user.isRegistered()) {
    // TODO: Fix auth bug
    user.sendMessage('- ERR: Oh hey, this is for admins only.');
    return false;
  }
  return (ADMINS.indexOf(user.name) !== -1);
}


// Callback for every mumble incoming message
function onMsg(msg, user, scope){
  msg = striptags(msg).trim(); // Cleanup

  if (['channel', 'private'].indexOf(scope) === -1){
    return;
  }
  if (msg[0] === '!') {
    // Log commands
    //console.log('[MSGLOG] scope(' + scope + ') user(' + user.name + ') MSG:', msg);
    if (msg && msg.length < 5000) {
       console.log(new Date(), '[MSGLOG] scope(' + scope + ') user(' + user.name + ') MSG:', JSON.stringify(msg));
    } else {
       console.log(new Date(), '[MSGLOG] scope(' + scope + ') user(' + user.name + ') MSG:', (msg ? '~too lengthy' : '~empty'));
    }

  } else {
    // Accidental PM protection
    if (scope === 'private') {
      user.sendMessage("[I AM A BOT] Either you sent me an invalid command or you PMed me by mistake.");
    }
    if (msg && msg.length < 5000) {
       console.log(new Date(), '[MSGLOG-no!] scope(' + scope + ') user(' + user.name + ') MSG:', JSON.stringify(msg));
    } else {
       console.log('[MSGLOG-no!] scope(' + scope + ') user(' + user.name + ') MSG:', (msg ? '~too lengthy' : '~empty'));
    }
    return;
  }

  var isMaster = false;
  if (user.name === 'richard') {
    isMaster = true;
  }

  // HOOK: Fake msg
  if (msg.indexOf('!say ') === 0) {
    chann.sendMessage(msg.split('!say ')[1]);
    return;
  }

  // HOOK: Restart
  if (msg === '!kill' || msg === '!restart' || msg === '!reboot') {
    if (hasAdminAccess(user)) {
      return process.exit(0);
    }
  }

  if (msg === '!whoami') {
    if (hasAdminAccess(user)) {
      user.sendMessage('- You are a BitcoinBot mod, but what am I?');
    } else {
      user.sendMessage("- You are a not a BitcoinBot mod");
    }
  } else if (msg.indexOf('!bal') === 0) {
    let address = msg.split('!bal ')[1]
    fetch('https://blockstream.info/api/address/'+address)
    .then(res => res.json())
    .then((out) => {
      let balance = "<br/> Balance: "+(out.chain_stats.funded_txo_sum/100000000);
      chann.sendMessage(balance);
    })
    .catch(err => { throw err });
  } else if (msg === '!price') {
    fetch('https://api.coindesk.com/v1/bpi/currentprice.json')
    .then(res => res.json())
    .then((out) => {
      let usdRate = out.bpi.USD.rate_float.toFixed(2);
      let eurRate = out.bpi.EUR.rate_float.toFixed(2);
      let gbpRate = out.bpi.GBP.rate_float.toFixed(2);;
      let theMessage = "<br/> USD: "+usdRate+" <br/> EUR: "+eurRate+" <br/> GBP: "+gbpRate;
      chann.sendMessage(theMessage);
    })
    .catch(err => { throw err });
  } else if (msg === '!height') {
    fetch('https://blockstream.info/api/blocks/tip/height')
    .then(res => res.json())
    .then((out) => {
      let blockHeight = "Last block: "+out;
      chann.sendMessage(blockHeight);
    })
    .catch(err => { throw err });
  } else if (msg === "!fees") {
    fetch('https://blockstream.info/api/fee-estimates')
    .then(res => res.json())
    .then((out) => {
        let feeRates = "<br/> Next: "+parseInt(out['1'])+" sat/vB <br/> 1hr: "+parseInt(out['6'])+" sat/vB <br/> 4hr: "+parseInt(out['24'])+" sat/vB <br/> 1d: "+parseInt(out['144'])+" sat/vB";
      chann.sendMessage(feeRates);
    })
    .catch(err => { throw err });
  } else if (msg === '!mempool') {
    fetch('https://blockstream.info/api/mempool')
    .then(res => res.json())
    .then((out) => {
      let mempool = "<br/> Unconfirmed transactions: "+parseInt(out.count)+" <br/> Mempool size: "+parseInt(out.vsize)+" vBytes <br/> Total fees paid: "+(out.total_fee/100000000)+" BTC";
      chann.sendMessage(mempool);
    })
    .catch(err => { throw err });
  } else if (msg === '!hash') {
    fetch('https://blockchain.info/q/hashrate')
    .then(res => res.json())
    .then((out) => {
      let hashrate = "Hashrate: "+out;
      chann.sendMessage(hashrate);
    })
    .catch(err => { throw err });
  } else if (msg === '!fact') {
    fetch('https://uselessfacts.jsph.pl/random.json?language=en')
    .then(res => res.json())
    .then((out) => {
      chann.sendMessage(out.text);
    })
    .catch(err => { throw err }); 
  } else if (msg.indexOf('!coinflip') === 0) {
    var choice = msg.split('!coinflip ')[1];
    if (choice === "heads" || choice === "tails") {
      var result = (Math.random()*100);
      if (result < 50) {
        var winner = "tails";
      } else {
        var winner = "heads";
      }
      if (choice === winner) {
          chann.sendMessage("Result: "+winner+" - you win!");
      } else {
          chann.sendMessage("Result: "+winner+" - you lose!");
      }
    } else {
        chann.sendMessage('!coinflip command requires heads or tails');
    }
  } else if (msg === '!kanye') {
      fetch('https://api.kanye.rest/')
      .then(res => res.json())
      .then((out) => {
        chann.sendMessage(out.quote);
      })
      .catch(err => { throw err }); 
  } else if (msg === '!help') {
    let commands = 'Commands: [!bal [bitcoin address], !coinflip [heads or tails], !fact, !fees, !kanye, !mempool, !price, !height, !say]';
    chann.sendMessage(commands);
  } else {
    // Accidental PM protection
    if (scope === 'private') {
      user.sendMessage("[I AM A BOT] Either you sent me an invalid command or you PMed me by mistake.");
    }
  }
}

setInterval(function() {
  fetch('https://api.coindesk.com/v1/bpi/currentprice.json')
  .then(res => res.json())
  .then((out) => {
    let usdRate = out.bpi.USD.rate_float.toFixed(2);
    let eurRate = out.bpi.EUR.rate_float.toFixed(2);
    let gbpRate = out.bpi.GBP.rate_float.toFixed(2);
    let theMessage = "<br/> USD: "+usdRate+" <br/> EUR: "+eurRate+" <br/> GBP: "+gbpRate;
    fetch('https://blockstream.info/api/fee-estimates')
    .then(res => res.json())
    .then((out) => {
      let feeRates = "<br/> Next: "+parseInt(out['1'])+" sat/vB <br/> 1hr: "+parseInt(out['6'])+" sat/vB <br/> 4hr: "+parseInt(out['24'])+" sat/vB <br/> 1d: "+parseInt(out['144'])+" sat/vB";
      chann.sendMessage(theMessage+" <br/> "+feeRates);
    })
    .catch(err => { throw err });
  })
  .catch(err => { throw err });
}, 600000);

setInterval(function() {
  fetch('https://uselessfacts.jsph.pl/random.json?language=en')
  .then(res => res.json())
  .then((out) => {
    chann.sendMessage(out.text);
  })
  .catch(err => { throw err }); 
}, 900000);

function onConnError(err) {
  console.error('[onConnError]', err);
  process.exit(1);
}

// Callback when connected to Mumble
function onMumbleConnected(error, connection) {
  if (error) { console.log('[CONNECT] ERR:', error); throw new Error(error); }

  console.log('(onConnect) Connected');
  conn = connection;
  connection.authenticate(MY_NICK, '', ACCESS_TOKENS);
  // Hooks
  connection.on('initialized', onAuthed);
  connection.on('message', onMsg);
  connection.on('error', onConnError);
}

// MUMBLE CONNECTION
var mumbleConnOpts = {};
if (!CONFIG.IS_TESTNET) {
  mumbleConnOpts = {
    key: fs.readFileSync(CONFIG.AUTH_KEY),
    cert: fs.readFileSync(CONFIG.AUTH_CERT),
  };
};

// Connect to mumble
console.log('Connecting to', CONFIG.MUMBLE_HOST);
mumble.connect('mumble://' + CONFIG.MUMBLE_HOST, mumbleConnOpts, onMumbleConnected);


// Callback after authentication
function onAuthed() {
  console.log( '(onAuthed) Connection initialized' );
  // Connection is authenticated and usable.
  var children = conn.rootChannel.children;
  var channId = null;
  var regexp = new RegExp(CHANN_NAME + '.*');
  for (var x in conn.rootChannel.children) {
    if (regexp.test(children[x].name)) {
      // console.debug('conn.rootChannel.children[' + x + '] id: ' + children[x].id + ', name: ' + children[x].name);
      channId = children[x].id;
    }
  }
  console.log('@channId:', channId);
  if (channId === null) {
    console.error('[ERR] couldnt find channId:', channId, ' # Proceeding with fallback:', CHANN_ID_FALLBACK);
    channId = CHANN_ID_FALLBACK;
  }
  //chann = conn.channelByName(CHANN_NAME);
  chann = conn.channelById(channId);
  chann.join();
  conn.user.setComment('BitcoinBot. Send !help for more');
  READY_TO_MSG = true;
};