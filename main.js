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
// There are three supported tools that developers may create
// by implementing a single function:
//   * Apps
//   * User Apps
//   * Commands - commands can manipulate user_logins and user_config.
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

let http = require('http');
let fs = require('fs');
let qs = require('querystring');
let db = require('./db.js').promiseAPI;
let template = require('lodash')._.template;
let HelpMessages = {};
let Commands = {};
let Aliases = {}
let Apps = {};
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
    USERS,
    SAVE_INTERVAL,
    PASSWORD_FIELD_PREFIX,
    APP_DATA,
    USER_INFOS,
    USER_CONFIGS,
    COOKIE,
    SESSION_COOKIE_LEN,
    SESSION_COOKIE_NAME,
    USER_ID_LEN,
    USER_SESSIONS,
    PASSWORD_MINLENGTH,
    GUEST_ID,
} = require("./const.js");

loadUserApp('guess', './app/guess.js');
loadCmd('config', './cmd/config.js');
let {parseConfig, dumpConfig, DEFAULT_CONFIG} = require('./cmd/config.js');

db.load(DB_FILE, function(){
   if(VERBOSE) console.log('database loaded: ' + DB_FILE); });

setInterval(()=>db.save(DB_FILE, ()=>{if(VERBOSE) console.log('database saved: ' + DB_FILE)}), SAVE_INTERVAL);

let cmd_page = template(fs.readFileSync('./views/cmd_page.html'));
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
// TODO normal apps need to be wrapped special to use the
// callback convention.
function loadApp(appname, filename){
    let app = require(filename);
    // app(state, args, puts, child_name, child_state) TODO
    Apps[appname] = app;
}

// wrap the app to keep per user/ per session state.
function loadUserApp(appname, filename){
    app = require(filename);
    Apps[appname] = function(args, puts, data){
        let state = data.app_state;
        let user_key = data.user_key;
        // console.log('state, user_key', state, user_key);
        if(state == null || !state.user_states){
            state = {user_states:{}};
        }
        // todo wrap in another datastructure.
        let user_state = (user_key in state.user_states)? state.user_states[user_key] : null;

        user_state = app(args, puts, {user_state: user_state});
        state.user_states[user_key] = user_state;
        return state;
    }
}

// TODO only sudo apps have access to password input.
// a db app is just an app, but with access to a global state object,
// and not per session state.
// TODO should use callbacks.
// function loadDataApp(db, /*filename,*/ appname){
//    let app = require(filename);
//    Apps[appname] = function(args, puts, state, app_context){
//        return app(args, puts, state, db, app_context);
//    }
//    // dataapp(db, args, puts)
//}
// console.log('apps', Apps)

Aliases.dark = 'config bg 000 fg fff';
Aliases.light = 'config bg fff fg 000';
Aliases.small = 'config rows 13 cols 25';
Aliases.medium = 'config rows 19 cols 54';
Aliases.large = 'config rows 28 cols 75';
Aliases.xlarge = 'config rows 40 cols 115';
Aliases.tall = 'config rows 33 cols 54';

HelpMessages.help = "Show help for a command. Example: \"help config\".";

Commands.newuser = function(args, puts, data){
    let passwords = data.passwords;
    let user_info = data.user_info;

    if(passwords.length != 2){
        puts("Error: newuser requires 2 passwords: password and confirm.");
        return; }
    if(passwords[0] != passwords[1]){
        puts("Error: password mismatch.");
        return; }
    if(passwords[0].length < PASSWORD_MINLENGTH){
        puts("Error: password too short.");
        break;
    }
    // to make a new user, add the username and password salt to the table user_infos

}
Commands.useraccount = function(args, puts, data){
    //args.
}
Commands.help = function(args, puts, data){
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
// user_logins|user_id: {username, password, salt}
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

let server = http.createServer(serverHandle);

async function serverHandle(request, response){

    // Step 0 - Initialize headers, page_data
    let headers = {"Content-Type": "text/html"};
    let page_data = {
        "title": "cmd",
        "config" : parseConfig(DEFAULT_CONFIG),
        "cmd_out" : DEFAULT_CMDOUT,
        "base_cmd_out" : "",
        "cmd_hist" : parseHist(DEFAULT_HIST),
        "app_name" : "",
        "app_state" : "",
        "session_cookie": "",
        "user_id": GUEST_ID,
        "user_key": "",
    }

    
    // Step 1 - Get session_cookie from request, and user_id from database.
    let request_cookies = parseCookies(request.headers['cookie']);
    if(request_cookies.hasOwnProperty(SESSION_COOKIE_NAME)){
        page_data.session_cookie = request_cookies[SESSION_COOKIE_NAME];
        page_data.user_id = await db.get(USER_SESSIONS + page_data.session_cookie);
    }

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
    let user_key = page_data.user_id;
    if(user_key == GUEST_ID){
        user_key = page_data.session_cookie; }
    page_data.user_key = user_key;
    console.log('user_key', user_key);

    // Step 4 - Get cmd_data {user_config, user_info} from database.
    let cmd_keys = { user_config: USER_CONFIGS + user_key, };
    let cmd_data = await db.get(cmd_keys);
    // console.log('cmd_data', cmd_data);
    // cmd_data.user_info = Default(cmd_data.user_info, {});
    cmd_data.user_config = Default(parseConfig(cmd_data.user_config), parseConfig(DEFAULT_CONFIG));
    for(let key in cmd_data.user_config){
        page_data.config[key] = cmd_data.user_config[key];
    }
    // TODO save user_config after command processing.
    // console.log('page_data.config', page_data.config);

    // Step 5 - handle GET or POST
    if(request.method == "GET"){
        response.writeHead(200, headers);
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
                // console.log('remove this debugging only!!! Passwords: ' + page_data.passwords.join(', '));
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

                let puts = function(s){ page_data.cmd_out += "\n" + s; }
                await handleCommand(page_data.cmd_text, puts, page_data);
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
    async function handleCommand(cmd_text, puts, page_data){
        if(!cmd_text) cmd_text = "";
        puts("> " + cmd_text);
        // aliases require full match
        if(cmd_text in Aliases){
            cmd_text = Aliases[cmd_text]; }
        let args = cmd_text.split(/\s+/);
        if(!args.length) return;
        let cmd = args[0];

        // clear command works in any context.
        if(cmd == 'clear'){
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
            }
            if(page_data.app_name.length){
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
                    let app_data_key = APP_DATA + page_data.app_name;
                    let app_state = await db.get(app_data_key);
                    let server_keys = {
                        "app_state" : app_data_key,
                    }
                    let server_data = {
                        "app_state": Apps[page_data.app_name](args, puts,
                            {app_state: app_state,
                             passwords: page_data.passwords,
                             user_key: user_key})
                    }
                    await db.set(server_keys, server_data); 
                }
            }
            else if(cmd in Commands){
                // page_data.app_name = "test app_name";
                Commands[cmd](args, _puts, cmd_data);
                for(var k in cmd_data.user_config){
                    page_data.config[k] = cmd_data.user_config[k]; }
                // console.log('page config, cmd config:', page_data.config, cmd_data.config);
                await db.set(USER_CONFIGS + user_key, dumpConfig(page_data.config));
                //await db.set(USER_INFOS + , dumpConfig(page_data.config));
                //server_data.user_configs[user_key] = dumpConfig(page_data.config);
                //server_data.user_infos[user_key] = server_data.user_info;
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
        if(cmd_out_lines.length >= page_data.config.rows){
            cmd_out_lines = cmd_out_lines.slice(cmd_out_lines.length - page_data.config.rows + 1);
        }
        template_data.cmd_out = cmd_out_lines.join("\n");
        template_data.base_cmd_out = page_data.base_cmd_out;
        // console.log('cmd_hist', data.cmd_hist);
        template_data.cmd_hist = dumpHist(page_data.cmd_hist);
        template_data.config = dumpConfig(page_data.config);
        template_data.app_name = page_data.app_name;
        template_data.app_state = page_data.app_state;
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

server.listen(PORT);

console.log(`Server running on port ${PORT}.`);
