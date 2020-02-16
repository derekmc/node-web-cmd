
const fs = require('fs');
const DEFAULT_DB_FILE = 'database.json';
const ALPHANUMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_LEN = 4;
const DEFAULT_TRIES = 4;

let __data = {};
// gets 'ids' from all keys matching the prefix.
exports.getIds = function(prefix, next){
    let result = [];
    for(let k in __data){
        if(k.indexOf(prefix) == 0){
            result.push(k.substr(prefix.length)); }}
    next(undefined, result);
}
exports.save = function(filename, next){
    fs.writeFile(filename? filename : DEFAULT_DB_FILE,
        JSON.stringify(__data), (err)=>{if(next) next(err)});
}
exports.load = function(filename, next){
    fs.readFile(filename? filename : DEFAULT_DB_FILE,
        {encoding: 'utf-8'}, function(err, data){

        if(err){
            next(err);
            return; }
        __data = JSON.parse(data);
        next();
    })
}
// for now, this only uses get and set callbacks with in memory data.
exports.get = function(key, next){
    next(__data[key]);
}

// newkey forces it to be a newkey.
exports.set = function(key, value, next){
    if(value === undefined){
        delete __data[key]; }
    else{
        __data[key] = value; }
    next();
}

function randstr(chars, len){
    let s = "";
    for(let i=0; i<len; ++i){
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}


// generates new key according to parameters, and passes it to next.
exports.genKey = function(args, initval, next){
    let prefix = args.prefix? args.prefix : "";
    let chars = args.chars? args.chars : ALPHANUMS;
    let len = args.len? args.len : DEFAULT_LEN;
    let tries = args.tries? args.tries : DEFAULT_TRIES;
    for(let i=0; i<tries; ++i){
        let id = randstr(chars, len);
        let k = prefix + id;
        if(!(k in __data)){
            __data[k] = initval;
            next(undefined, id);
            return;
        }
    }
    next('Could not find available key', null);
    return;
}
