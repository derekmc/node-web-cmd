
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
    if(!next || (typeof next != 'function')) throw new Error('no next func');
    next(__data[key]);
}

// setNew forces it to be a newkey.
exports.set = function(key, value, next){
    if(!next || (typeof next != 'function')) throw new Error('no next func');
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


// generates new id according to parameters,
// sets the value with the prefix, and passes id to next.
// optional: idRef is a unique lookup reference to the id, must be empty.
exports.genId = function(args, next){
    if(!next || (typeof next != 'function')) throw new Error('no next func');
    let prefix = args.prefix? args.prefix : "";
    let idRef = args.idRef; // make sure idRef is empty if provided.
    let refOnly = args.refOnly; 
    let chars = args.chars? args.chars : ALPHANUMS;
    let len = args.len? args.len : DEFAULT_LEN;
    let tries = args.tries? args.tries : DEFAULT_TRIES;
    let init = ('init' in args)? args.init : null;
    if(idRef && (idRef in __data)){
        console.log('idRef', idRef);
        next(`idRef '${idRef}' already exists.`, __data[idRef]);
        return; }
    for(let i=0; i<tries; ++i){
        let id = randstr(chars, len);
        let k = prefix + id;
        if(!(k in __data)){
            if(!refOnly){ __data[k] = init; }
            if(idRef){ __data[idRef] = id; }
            next(undefined, id);
            return;
        }
    }
    next('Could not find available key', null);
    return;
}
