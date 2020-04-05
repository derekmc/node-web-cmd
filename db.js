
const fs = require('fs');
const DEFAULT_DB_FILE = 'database.json';
const ALPHANUMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_LEN = 4;
const DEFAULT_TRIES = 4;


// 'next' callbacks use the following format:
//    next(err, result)
// 

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
// destructuring get and set, can use arrays or sets of objects.
// for now, this only uses get and set callbacks with in memory data.
exports.get = function(key, next){
    if(!next) next = function(){}
    if(typeof next != 'function') throw new Error('no next func');
    let keytype = typeof key;

    let result;
    if(keytype == "object"){
        if(Array.isArray(key)){
            result = [];
            for(let i=0; i<key.length; ++i){
                result[i] = __data[key[i]]; }}
        else{
            result = {};
            for(let k in key){
                result[k] = __data[key[k]]; }}}
    else{
        result = __data[key];
    }
    return next(result);
}

// setNew forces it to be a newkey.
exports.set = function(key, value, next){
    if(!next) next = function(){}
    if(typeof next != 'function') throw new Error('no next func');
    let keytype = typeof key;

    if(keytype == "object"){
        if(Array.isArray(key)){
            if(typeof value != "object"){
                throw new Error("db.js: destructursing 'set' call requires value type to match key type 'array'"); }
            if(!Array.isArray(value)){
                throw new Error("db.js: destructursing 'set' call requires value type to match key type 'array'"); }
            if(key.length != value.length){
                throw new Error("db.js: destructursing 'set' call requires value array length to match key array length."); }
            for(let i=0; i<key.length; ++i){
                let k = key[i];
                let v = value[i];
                if(v === undefined){
                    delete __data[k];}
                else{
                    __data[k] = v; }}
        } 
        else{
            if(typeof value != "object"){
                throw new Error("db.js: destructursing 'set' call requires value type to match key type 'object'"); }
            if(Array.isArray(value)){
                throw new Error("db.js: destructursing 'set' call requires value type to match key type 'object'"); }
            for(let k in key){
                if(!(k in value)){
                    throw new Error("db.js: destructursing 'set' call requires value key for key key '" + k + "'"); }
                let _k = key[k];
                let _v = value[k];
                if(_v === undefined){
                    delete __data[_k]; }
                else{
                    __data[_k] = _v; }
            }
        }
    }
    else{
        if(value === undefined){
            delete __data[key]; }
        else{
            __data[key] = value; }
    }
    return next();
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
// optional: reference is a unique lookup reference to the id, must be empty.
/// args: {
//    prefix, // the key's prefix.
//    reference, // store a reference to the key here.
//    refOnly, // only store a reference, and don't make anything else.
//    len, // the length of the key to generate
//    tries, // how many times to repeat attempts.
//    init, // the initialization function.
// }
exports.genId = function(args, next){
    if(!next || (typeof next != 'function')) throw new Error('no next func');
    let prefix = args.prefix? args.prefix : "";
    let reference = args.reference; // make sure reference is empty if provided.
    let refOnly = args.refOnly; 
    let chars = args.chars? args.chars : ALPHANUMS;
    let len = args.len? args.len : DEFAULT_LEN;
    let tries = args.tries? args.tries : DEFAULT_TRIES;
    let init = ('init' in args)? args.init : null;
    if(reference && (reference in __data)){
        console.log('reference', reference);
        next(`reference '${reference}' already exists.`, __data[reference]);
        return; }
    for(let i=0; i<tries; ++i){
        let id = randstr(chars, len);
        let k = prefix + id;
        if(!(k in __data)){
            if(!refOnly){ __data[k] = init; }
            if(reference){ __data[reference] = id; }
            next(undefined, id);
            return;
        }
    }
    next('Could not find available key', null);
    return;
}
