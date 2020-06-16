// 
// main.js
//
//  Use for building custom scientific, statistical, and accounting tools,
//  that can be accessed and used over a SaaS online interface.
//
// This is the main file for node-web-cmd, which supports writing
// commandline tools that are accessed from a browser interface,
// over the network, and are rendered on the server.
//
// Node.js was chosen for two reasons: it provides modern tools
// and because javascript is a well known language.
//
// There are two supported tool types that developers may create,
// each by implementing a single function:
//   * Apps - have access to user specific 'user_state', and global 'app_state'.
//   * Commands - commands can manipulate user_info, user_config, and user_id for current session.
// 
// Each type of function accepts 3 arguments:
//   * args: the command line arguments, including the name of the tool.
//   * puts: use this to write to standard out.
//   * data: additional data unique to each tool.
//
// Here are the data arguments that are provided to each respective tool type:
//
// App 'data' arguments ====
//  user_key: the session_cookie or user_id, depending on whether the user is logged in.
//  app_state: the state for a particular app. if it is a "User App", it wraps 'user_states'.
//
// User App 'data' arguments ====
//  user_state:
//    user apps are called from a wrapper around normal apps, that
//    only passes 'user_state' variable, from the 'user_states' property
//    of a normal App's 'app_state'.  The 'user_states' lookup key,
//    called 'user_key', is 'user_id' if they are logged in, and 'session_cookie'
//    otherwise.
//
// Command 'data' arguments ====
//    user_info:
//       null if not logged in, otherwise {user_id, user_name}.
//       To create a new user, set this value to {user_name, password_salt, password_hash, password_hash_func}.
//    user_config: the user's configuration for the terminal
//    (TODO) session_config: the configuration is always based on the session.
//    
//  
//  

// Command 'data' arguments

//try{
const T = require('value-types');
//}catch(e){
//    const T = function(){ return arguments[arguments.length - 1]; }
//}
const express = require('express');
const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const db = require('./db.js').promiseAPI;
const levelup = require('levelup');
const leveldown = require('leveldown');
const key_db = levelup(leveldown('./mydb'));
const template = require('lodash')._.template;
const HelpMessages = {};
const Commands = {};
const Aliases = {}
const Apps = {};
let PORT = 8000;
if(process.argv.length >= 3){
    PORT = process.argv[2]; }

function Default(value, _default){
    if(value === null || value === undefined) return _default;
    return value;
}

const DB_FILE = "webapp_data.json";
const VERBOSE = false;

// map of session_cookie to user_ids.  Guest sessions have empty string id: "".
// if it's a guest session, store the app user_data by session_cookie, and not user_id.
const {
    SAVE_INTERVAL,
    KILL_FILE,
    KILL_INTERVAL,
    PASSWORD_FIELD_PREFIX,
    APP_DATA,
    USER_CONFIGS,
    USER_APP_DATA,
    USER_NAMES,
    USER_INFOS,
    COOKIE,
    SESSION_COOKIE_LEN,
    SESSION_COOKIE_NAME,
    USER_ID_LEN,
    USER_SESSIONS,
    PASSWORD_MINLENGTH,
    PASSWORD_SALT_LEN,
    GUEST_ID,
    GUEST_NAME,
} = require("./const.js");

loadApp('guess', './app/guess.js');
loadApp('hanoi', './app/hanoi.js');
loadApp('cookiejar', './app/cookiejar.js');
loadCmd('user', './cmd/user.js');
loadCmd('config', './cmd/config.js');
let {parseConfig, dumpConfig, mergeMap, DEFAULT_CONFIG} = require('./cmd/config.js');


// load database
(async ()=>{
    try{
        await db.load(DB_FILE); 
        if(VERBOSE) console.log('database loaded: ' + DB_FILE);
    } catch(err) {
        console.error("error loading database file", err);
    }
})()

// save database on intervals
setInterval(async ()=>{
    try{ 
        await db.save(DB_FILE);
        if(VERBOSE) console.log('database saved: ' + DB_FILE);
    } catch(err) {
        console.err("error saving database file", err);
    }
}, SAVE_INTERVAL);

/*
setInterval(async ()=>{
    if(fs.existsSync(KILL_FILE)){
        // save database one last time.
        try{ 
            await db.save(DB_FILE);
            if(VERBOSE) console.log('database saved: ' + DB_FILE);
        } catch(err) {
            console.err("error saving database file", err);
        }
        console.log(`Found KILL_FILE '${KILL_FILE}', shutting down.`);
        fs.unlinkSync(KILL_FILE);
        process.exit(0);
    }
}, KILL_INTERVAL)
*/

let cmd_page = template(fs.readFileSync('./views/cmd_page.html'));
let user_page = template(fs.readFileSync('./views/user_page.html'));
let about_page = template(fs.readFileSync('./views/about_page.html'));
const NEW_CONTEXT = "==NEW CONTEXT==";
const alphanum_regex = /^[A-Za-z0-9 ]*$/;

// config is a whitespace separated list of tuples
// TODO allow setting the data context with config: 'browser', 'cookie', 'user', or 'session'
// apps that aren't data apps simply use the configured data context.
const DEFAULT_HIST = "help";
const DEFAULT_CMDOUT = "Type 'help' for help.";
const ALPHANUMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


function randstr(chars, len){
    let s = "";
    for(let i=0; i<len; ++i){
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

// sanitize all fields
// TODO make sure this sanitization is sufficient and accurate.
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/\"/g, "&quot;")
         .replace(/\'/g, "&#039;");
}

// Commands are just apps that operate on the global state context,
// and not a localized state.

// TODO loadCmd and loadApp functions load apps or commands from a file and set their help messages.
// TODO a DataApp uses database callbacks like revision-db.
function loadCmd(cmdname, filename){
    let cmd_module = require(filename);
    HelpMessages[cmdname] = cmd_module.help;
    Commands[cmdname] = cmd_module.command;
}

// apps have access to user_state and app_state, and can save either one.
// callback convention.
function loadApp(appname, filename){
    let app = require(filename);
    // app(args, puts, data: {user_state, app_state}) TODO
    Apps[appname] = app;
}

Aliases.cj = "cookiejar";
Aliases.login = 'user login';
Aliases.logout = 'user logout';
Aliases.newuser = 'user new';
Aliases.dark = 'config bg 000 fg fff';
Aliases.retro = 'config bg 000 fg 6fa';
Aliases.light = 'config bg fff fg 000';
Aliases.small = 'config rows 13 cols 25';
Aliases.medium = 'config rows 19 cols 54';
Aliases.large = 'config rows 28 cols 75';
Aliases.xlarge = 'config rows 40 cols 115';
Aliases.tall = 'config rows 33 cols 54';

HelpMessages.help = "Show help for a command. Example: \"help config\".";

Commands.help = function(args, call, data){
    let puts = call.puts;
    if(args.length == 1){
        let cmdlist = [];
        let applist = getKeys(Apps);
        cmdlist = cmdlist.concat(getKeys(Commands));
        cmdlist = cmdlist.concat(getKeys(Aliases));
        let CMD_ROW = 5;
        let lists= {'Apps': applist, 'Commands': cmdlist};
        for(let listname in lists){
            let row = [];
            let list = lists[listname];
            for(let i=0; i<list.length; ){
                if(i > 0){ // one less on first row only.
                    row.push(list[i]);
                    ++i; }
                if(i < list.length){
                    for(let j=0; j<CMD_ROW - 1; ++j){
                        row.push(list[i]);
                        if(++i == list.length) break; }}
                //if(i == list.length) break;
                puts((i<=CMD_ROW? listname + ": " : " ") + row.join(', ') + (i < list.length - 1? ',': ''));
                row = []; }
            if(row.length) puts(" " + row.join(', '));
        }
        puts("Type \"help <command>\" for command help.");
        return;
    }
    //args.push('help'); }
    for(var i=1; i<args.length; ++i){
        let cmd = args[i];
        if(cmd in HelpMessages){
            puts(cmd + ": " + HelpMessages[cmd]); }
        else if(cmd in Aliases){
            puts("Alias '" + cmd + "': " + Aliases[cmd]); }
        else{
            puts("No help for '" + cmd + "'."); }
    }
}


// second map overwrites first.
function getKeys(obj){
    let keys = [];
    for(let k in obj){
        keys.push(k); }
    return keys;
}
function parseHist(hist_str){
    let ctx_array = hist_str.trim().split(NEW_CONTEXT);
    let result = [];
    for(let i=0; i<ctx_array.length; ++i){
        let ctx_str = ctx_array[i];
        let hist_lines = ctx_str.split(/\s*\n\s*/g);
        result.push(hist_lines);
    }
    return result;
}
function lastHistItem(history){
    if(history.length == 0){
        return ""; }
    let last_context = history[history.length - 1];
    if(last_context.length == 0){
        return ""; }
    let last_item = last_context[last_context.length - 1];
    return last_item;
}

function dumpHist(hist){
    let result_array = [];
    if(!hist) return "";
    for(let i=0; i<hist.length; ++i){
        result_array.push(hist[i].map(function(s){ return s.trim()}).join("\n"));
    }
    return result_array.join(NEW_CONTEXT) + "\n";
}

function parseCookies(str){
    if(!str) return {};
    let result = {};
    let parts = str.split(/\;\s*/g);
    for(let i=0; i<parts.length; ++i){
        let part = parts[i];
        let index = part.indexOf("=");
        if(index > 0){
            let key = part.substr(0, index).trim();
            let value = part.substr(index+1).trim();
            result[key] = value;
        }
    }
    return result;
}


// Database data schema
// difference between guest and a user? A user has login info.
// sessions|session_cookie: user_id
// user_config|user_id: config
// user_sessions|user_id: [session_cookies]
// user_info|user_id: {username, password_hash, is_admin}
// app_data|app_name: { user_states : state } 
//   
// user_sessions
// user_configs

// Main server function involves the following steps:
//  Step 0 - Initialize headers, page_data.
//  Step 1 - Get session_cookie from request, and user_id from database.
//  Step 2 - Generate session_cookie if not set.
//  Step 3 - Set user_key to the user_id, or to the session_cookie if a guest session.
//  Step 4 - Get cmd_data {user_config} from database.

let app = express();

let server = app.listen(PORT, function(){

    var host = server.address().address
    var port = server.address().port
    console.log("Listening at http://%s:%s", host, port)
})


async function getLoginData(request){
    let login_data = {
        session_cookie: "",
        user_id: GUEST_ID,
        user_name: GUEST_NAME,
    };
    let request_cookies = parseCookies(request.headers['cookie']);
    if(request_cookies.hasOwnProperty(SESSION_COOKIE_NAME)){
        login_data.session_cookie = request_cookies[SESSION_COOKIE_NAME];
        login_data.user_id = await db.get(COOKIE + login_data.session_cookie);
        if(!login_data.user_id){ // if lookup fails, clear session cookie and create new session.
            login_data.session_cookie = "";
            login_data.user_id = GUEST_ID; }
        login_data.user_name = (login_data.user_id == GUEST_ID? GUEST_NAME : 
            (await db.get(USER_INFOS + login_data.user_id)).username);
    }

    return T(LoginData, login_data);
}


//let server = http.createServer(serverHandle);

app.get('/about', async function(request, response){
    let headers = {"Content-Type": "text/html"};
    response.writeHead(200, headers);

    let template_data = {title: "About WebApp Terminal."};

    let login_data = T(LoginData, await getLoginData(request));
    template_data.user_name = login_data.user_name;
    template_data.logged_in = (login_data.user_id != GUEST_ID);

    let user_key = login_data.user_id;
    if(user_key == undefined){
        user_key = login_data.user_id = GUEST_ID; }
    if(user_key == GUEST_ID){
        user_key = login_data.session_cookie; }
 
    let keys = { user_config: USER_CONFIGS + user_key };
    let data = await db.get(keys);
    data.config = mergeMap(parseConfig(DEFAULT_CONFIG), parseConfig(data.user_config));

    for(let key in data.config){
        template_data[key] = data.config[key];
    }

    let html = about_page(template_data);

    response.end(html);
})

async function userRequestHandler(request, response){
    let headers = {"Content-Type": "text/html"};
    response.writeHead(200, headers);

    let form_error = null;
    let form_message = "";
    if(request.method == "POST"){
        let requestBody = '';
        request.on('data', function(_data){
            requestBody += _data;
            if(requestBody.length > 1e7) {
                response.writeHead(413, 'Request Entity Too Large', {'Content-Type': 'text/html'});
                response.end('<!doctype html><html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>');
            }
        });
        request.on('end', async function(){
            function puts(s){
                // console.log('form puts:', s);
                form_message += (s? s: "") + "\n";
            }
            try{
                let formData = qs.parse(requestBody);
                // console.log("formData", formData);
                let loginData = await getLoginData(request);

                // santize all form fields for html characters.
                for(let k in formData){
                    formData[k] = escapeHtml(formData[k]); }
                let action = formData.action;
                if(action == "user_login"){
                    // console.log('form user login');

                    if(!("user_login_password" in formData)){
                        throw new Error("No user_login form password."); }
                    if(!("user_login_username" in formData)){
                        throw new Error("No user_login form username."); }

                    let args = ['user', 'login', formData.user_login_username];
                    let cmd_data = {passwords: [formData.user_login_password]}
                    Object.assign(cmd_data, loginData);
                    let login_success = await Commands['user'](args, {puts: puts, db: db}, cmd_data);
                    if(!login_success){
                        form_error = form_message;
                        form_message = null; }
                } else if(action == "user_logout"){
                    let args = ['user', 'logout'];
                    let logout_success = await Commands['user'](args, {puts: puts, db: db}, loginData);
                    if(!logout_success){
                        form_error = form_message;
                        form_message = null; }

                    // console.log('form user logout');
                } else if(action == "create_user"){
                    if(!("create_user_username" in formData)){
                        throw new Error("No create_user form username."); }
                    if(!("create_user_password" in formData)){
                        throw new Error("No create_user form password."); }
                    if(!("create_user_confirm_password" in formData)){
                        throw new Error("No create_user form confirm password."); }

                    let args = ['user', 'new', formData.create_user_username];
                    let cmd_data = {passwords: [formData.create_user_password, formData.create_user_confirm_password]}
                    Object.assign(cmd_data, loginData);
                    let create_user_success = await Commands['user'](args, {puts: puts, db: db}, cmd_data);
                    if(!create_user_success){
                        form_error = form_message;
                        form_message = null; }

                    // console.log('form user new');
                } else {
                    throw new Error("unknown form action: " + action);
                }
            }
            catch(error){
                errorResponse(error);
            }
            await finishRequest();
        })
    } else if(request.method == "GET"){
        await finishRequest();
    } else {
        throw new Error("Invalid HTTP method for user page.");
    }
    async function finishRequest(){
        let template_data = {title: "Login/Logout Page."};

        let login_data = T(LoginData, await getLoginData(request));
        template_data.user_name = login_data.user_name;
        template_data.logged_in = (login_data.user_id != GUEST_ID);
        template_data.form_error = form_error;
        template_data.form_message = form_message;
        //template_data.form_message = "The Quick Brown Fox Jumped Over The Lazy Dogs Gracefully Today.";

        let user_key = login_data.user_id;
        if(user_key == undefined){
            user_key = login_data.user_id = GUEST_ID; }
        if(user_key == GUEST_ID){
            user_key = login_data.session_cookie; }
     
        let keys = { user_config: USER_CONFIGS + user_key };
        let data = await db.get(keys);
        data.config = mergeMap(parseConfig(DEFAULT_CONFIG), parseConfig(data.user_config));

        for(let key in data.config){
            template_data[key] = data.config[key];
        }

        let html = user_page(template_data);
        response.end(html);
    }
    function errorResponse(error){
        console.error('Error handling request.', error);
        response.writeHead(500, {"Content-Type": "text/html"});
        let html = "<h1>Unhandled error.</h1>";
        response.end(html);
    }
}
app.get('/user', userRequestHandler);
app.post('/user', userRequestHandler);

app.get('/', cmdRequestHandler);
app.post('/', cmdRequestHandler);

const LoginData = {
    session_cookie: "",
    user_id: "",
    user_name: "",
}

async function cmdRequestHandler(request, response){

    // Step 0 - Initialize headers, page_data
    let headers = {"Content-Type": "text/html"};
    let page_data = {
        "title": "WebApp Terminal (v0)",
        "user_name": GUEST_NAME,
        "config" : parseConfig(DEFAULT_CONFIG),
        "cmd_out" : DEFAULT_CMDOUT,
        "base_cmd_out" : "",
        "cmd_hist" : parseHist(DEFAULT_HIST),
        "app_name" : "",
        "app_state" : "",
        "session_cookie": "",
        "user_id": GUEST_ID,
        "user_key": "",
        "is_admin" : false,
    }

    
    // Step 1 - Get session_cookie, user_id, and user_name.
    Object.assign(page_data, await getLoginData(request));

    // Step 2 - Generate session_cookie if it does not exist.
    if(page_data.session_cookie == ""){
        page_data.session_cookie = await db.genId({
            prefix: COOKIE,
            len: SESSION_COOKIE_LEN,
            init: page_data.user_id,
        })
        headers['Set-Cookie'] = SESSION_COOKIE_NAME + "=" + page_data.session_cookie + ";";
    }

    // Step 3 - Set user_key to user_id, or to session_cookie if guest session.
    page_data.user_key = page_data.user_id;
    if(page_data.user_key == undefined){
        page_data.user_key = page_data.user_id = GUEST_ID; }
    if(page_data.user_key == GUEST_ID){
        page_data.user_key = page_data.session_cookie; }
    // console.log('user_key', page_data.user_key);

    let cmd_keys = { user_config: USER_CONFIGS + page_data.user_key, user_info: USER_INFOS + page_data.user_key, };
    let cmd_data = await db.get(cmd_keys);
    page_data.is_admin = cmd_data.user_info? (cmd_data.user_info.is_admin? true : false) : false;
    page_data.config = cmd_data.user_config = mergeMap(parseConfig(DEFAULT_CONFIG), parseConfig(cmd_data.user_config));


    // TODO save user_config after command processing.
    // console.log('page_data.config', page_data.config);

    // Step 5 - handle GET or POST
    if(request.method == "GET"){
        // response.writeHead(200, headers);
        cmdPage(page_data);
    }
    if(request.method == "POST"){
        let requestBody = '';
        request.on('data', function(_data){
            requestBody += _data;
            if(requestBody.length > 1e7) {
                response.writeHead(413, 'Request Entity Too Large', {'Content-Type': 'text/html'});
                response.end('<!doctype html><html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>');
            }
        });
        request.on('end', async function(){
            try{
                let formData = qs.parse(requestBody);

                // santize all form fields for html characters.
                for(let k in formData){
                    formData[k] = escapeHtml(formData[k]); }

                let cmd_text = "";
                // handle form data to modify local variables and 
                page_data.passwords = [];
                for(var i=1; true; ++i){
                    let field_name = PASSWORD_FIELD_PREFIX + i;
                    if(!formData[field_name]){
                        break; }
                    page_data.passwords.push(formData[field_name]);
                }
                // session token must match the allowed characters, but could otherwise be forged.
                if(formData.cmd_out){
                    page_data.cmd_out = formData.cmd_out;
                }
                if(formData.base_cmd_out){
                    page_data.base_cmd_out = formData.base_cmd_out;
                }
                if(formData.cmd_hist){
                    page_data.cmd_hist = parseHist(formData.cmd_hist);
                }
                // TODO do we want an app stack?
                // when an app in the app stack returns,
                // the child app_name and child app_state
                // are passed as extra parameters to the app.
                if(formData.app_name){
                    page_data.app_name = formData.app_name;
                }
                if(formData.cmd_text){
                    page_data.cmd_text = formData.cmd_text;
                    if(page_data.cmd_text.length){
                        if(!page_data.cmd_hist){
                            page_data.cmd_hist = [[]]; }
                        if(!page_data.cmd_hist.length){
                            page_data.cmd_hist.push([]); }
                        let last_hist_item = lastHistItem(page_data.cmd_hist);
                        if(page_data.cmd_text != last_hist_item){
                            page_data.cmd_hist[page_data.cmd_hist.length - 1].push(page_data.cmd_text); }
                    }
                }

                let puts = function(s){ page_data.cmd_out += "\n" + (s? s: ""); }
                await handleCommand(page_data.cmd_text, {puts: puts, db: key_db}, page_data);
                cmdPage(page_data);
            }
            catch(error){
                errorResponse(error);
            }
        });
    }
    function errorResponse(error){
        console.error('Error handling request.', error);
        response.writeHead(500, {"Content-Type": "text/html"});
        let html = "<h1>Unhandled error.</h1>";
        response.end(html);
    }
    async function handleCommand(cmd_text, call, page_data){
        let puts = call.puts;
        if(!cmd_text) cmd_text = "";
        puts("> " + cmd_text);
        // aliases match on just the first part of command.
        let args = cmd_text.split(/\s+/);
        if(page_data.app_name.length == 0 && args[0] in Aliases){
            cmd_text = Aliases[args[0]] + " " + args.slice(1).join(" ");
            args = cmd_text.split(/\s+/); }
        if(args[0] == "") args = [];
        if(page_data.app_name == "" && !args.length) return;
        let cmd = args[0];

        // clear command works in any context.
        if(cmd == 'clear'){
            // page_data.entering_app = true;
            page_data.cmd_out = ""; }
        else{
            if(page_data.app_name == "" && (cmd in Apps)){
                page_data.base_cmd_out = page_data.cmd_out;
                page_data.cmd_out = `'${cmd}' started. Type 'exit' to exit.\n`;
                page_data.app_name = cmd;
                page_data.cmd_hist.push([]); // add a new layer of history.
                // when entering app, remove appname from args
                args = args.slice(1);
                page_data.app_state;
                page_data.entering_app = true;
            }
            if(page_data.app_name.length){
                let app_state_key = APP_DATA + page_data.app_name;
                let user_state_key = USER_APP_DATA + page_data.user_key + "|" + page_data.app_name;
                if(cmd == "reset"){ // resets user
                    page_data.cmd_out = "";
                    await db.set(user_state_key, undefined);
                }
                if(cmd == "exit"){
                    page_data.cmd_out = page_data.base_cmd_out;
                    page_data.cmd_out += "\n'" + page_data.app_name + "' terminated.";
                    page_data.base_cmd_out = "";
                    page_data.app_state = "";
                    // console.log('cmd_hist', page_data.cmd_hist);
                    page_data.cmd_hist.pop(); // remove a layer of history.
                    page_data.app_name = ""; }
                else{
                    // TODO handle data_context config parameter.
                    // TODO handle app_context.
                    // TODO handle
                    let app_keys = {
                        'app_state' : app_state_key,
                        'user_state' : user_state_key,
                    }
                    let data = await db.get(app_keys);
                    // additional data made available to the app.
                    data.entering_app = page_data.hasOwnProperty('entering_app')? page_data.entering_app : false;
                    data.user_key = page_data.user_key;
                    data.passwords = page_data.passwords;
                    data.is_admin = page_data.is_admin;
                    let result = null;
                    try{
                        result = await Apps[page_data.app_name](args, {puts: puts, db: key_db}, data);
                    } catch(e) {
                        puts("\"" + (e.hasOwnProperty('message')? e.message : e) + "\"");
                    }
                    if(result){
                        let save_keys = {};
                        let save_data = {}; // copy results we want to save, to save_data
                        // Save whatever results were provided by the return value of the app.
                        if(result.hasOwnProperty('user_state')){
                            save_keys.user_state = user_state_key;
                            save_data.user_state = result.user_state; }
                        if(result.hasOwnProperty('app_state')){
                            save_keys.app_state = app_state_key; 
                            save_data.app_state = result.app_state; }
                        await db.set(save_keys, save_data);
                    }
                }
            }
            else if(cmd in Commands){
                // page_data.app_name = "test app_name";

                // Get cmd_data {user_config, user_info, user_id, passwords} from database.
                // console.log('getting config for key', page_data.user_key);
                // console.log('cmd_data', cmd_data);
                cmd_data.user_id = page_data.user_id;
                cmd_data.user_key = page_data.user_key;
                cmd_data.user_name = page_data.user_name;
                cmd_data.session_cookie = page_data.session_cookie;
                for(let key in cmd_data.user_config){
                    page_data.config[key] = cmd_data.user_config[key];
                }
                cmd_data.passwords = page_data.passwords;
                cmd_data.is_admin = page_data.is_admin;

                let cmd_result = await Commands[cmd](args, {puts: _puts, db: db}, cmd_data);
                //puts("Command finished.");

                let config_dirty = false;
                // checking if username changed to change config, etc.
                if(page_data.user_key != cmd_data.user_key){
                    page_data.user_key = cmd_data.user_key;
                    cmd_data.user_config = await db.get(USER_CONFIGS + cmd_data.user_key);
                    // console.log('cmd_data.user_config, default', cmd_data.user_config, DEFAULT_CONFIG);
                    cmd_data.user_config = mergeMap(parseConfig(DEFAULT_CONFIG), parseConfig(cmd_data.user_config));
                    page_data.user_name = cmd_data.user_name;
                    page_data.is_admin = cmd_data.is_admin;
                    //page_data.config = cmd_data.user_config;
                }
                if(cmd_data.user_config){
                    for(var k in cmd_data.user_config){
                        if(page_data.config[k] != cmd_data.user_config[k]){
                            config_dirty = true;
                            page_data.config[k] = cmd_data.user_config[k]; }}
                }
                //if(cmd_data.user_info != null){
                //    cmd_data.user_info = ; }

                // console.log('page config, cmd config:', page_data.config, cmd_data.config);
                // console.log('cmd_data.user_info', cmd_data.user_info);
                let assign_keys = [];
                let assign_values = [];

                if(config_dirty){
                    assign_keys.push(USER_CONFIGS + page_data.user_key);
                    assign_values.push(dumpConfig(page_data.config)); }
                //if(false && cmd_data.user_info != null){
                //    assign_keys.push(USER_INFOS + page_data.user_key);
                //    assign_values.push(cmd_data.user_info);
                //    assign_keys.push(USER_NAMES + cmd_data.user_info.username);
                //    assign_values.push(cmd_data.user_id); }
                if(assign_keys.length){
                    await db.set(assign_keys, assign_values); }
                //db.set(server_keys, server_data);
            }
            else{
                puts(" Unknown command: '" + cmd + "'");
            }
        }
        // wrap puts to start all lines with a space.
        function _puts(s){ puts(' ' + s); }
    }
    // closure for rendering the page.
    function cmdPage(page_data){
        let template_data = {};

        template_data.title = page_data.title;

        let cmd_list = [];
        cmd_list = cmd_list.concat(getKeys(Commands));
        cmd_list = cmd_list.concat(getKeys(Aliases));
        cmd_list = cmd_list.concat(getKeys(Apps));
        template_data.cmd_list = cmd_list.join(' ');

        let cmd_out_lines = page_data.cmd_out.split("\n");

        // if(false && page_data.config.overflow == "hide"){
        //     if(cmd_out_lines.length >= page_data.config.rows){
        //         cmd_out_lines = cmd_out_lines.slice(cmd_out_lines.length - page_data.config.rows + 1);
        //     }
        // }
        template_data.cmd_out = cmd_out_lines.join("\n");
        template_data.base_cmd_out = page_data.base_cmd_out;
        // console.log('cmd_hist', data.cmd_hist);
        template_data.cmd_hist = dumpHist(page_data.cmd_hist);
        template_data.config = dumpConfig(page_data.config);
        template_data.app_name = page_data.app_name;
        template_data.app_state = page_data.app_state;
        template_data.user_name = page_data.user_name;
        template_data.is_admin = page_data.is_admin;
        // template_data.session_cookie = page_data.session_cookie;

        // add config vars to rendering data context.
        for(let key in page_data.config){
            template_data[key] = page_data.config[key];
        }

        //console.log('template_data', template_data);
        response.writeHead(200, headers);
        let html = cmd_page(template_data);
        response.end(html);
    }
}


