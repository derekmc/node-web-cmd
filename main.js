
let http = require('http');
let fs = require('fs');
let qs = require('querystring');
let db = require('./db.js');
let template = require('lodash')._.template;
let HelpMessages = {};
let Commands = {};
let Aliases = {}
let Apps = {};
const PORT = 8000;
const DB_FILE = "webapp_data.json";
const SAVE_INTERVAL = 10*1000;
const VERBOSE = false;
const PASSWORD_FIELD_PREFIX = "cmd_password_input_";

db.load(DB_FILE, function(){
   console.log('database loaded: ' + DB_FILE); });

setInterval(()=>db.save(DB_FILE, ()=>{if(VERBOSE) console.log('database saved: ' + DB_FILE)}), SAVE_INTERVAL);

if(process.argv.length >= 3){
    PORT = process.argv[2]; }

let cmd_page = template(fs.readFileSync('./views/cmd_page.html'));
const NEW_CONTEXT = "==NEW CONTEXT==";
const config_regex = /^[A-Za-z0-9 ]*$/;

// config is a whitespace separated list of tuples
// TODO allow setting the data context with config: 'browser', 'cookie', 'user', or 'session'
// apps that aren't data apps simply use the configured data context.
const DEFAULT_CONFIG = "rows 19 cols 54 fg 000 bg fff";
const DEFAULT_HIST = "help";
const DEFAULT_CMDOUT = "Type 'help' for help.";

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

// TODO loadCommand and loadApp functions load apps or commands from a file and set their help messages.
// TODO a DataApp uses database callbacks like revision-db.
function loadCmd(filename, cmdname){
    // cmd(state, args, puts)
}
// TODO normal apps need to be wrapped special to use the
// callback convention.
function loadApp(appname, filename){
    app = require(filename);
    // app(state, args, puts, child_name, child_state) TODO
    Apps[appname] = app;
}
// TODO only sudo apps have access to password input.
// a db app is just an app, with a wrapped database reference in a closure.
// TODO should use callbacks.
function loadDataApp(db, /*filename,*/ appname){
    let app = require(filename);
    Apps[appname] = function(args, puts, state, app_context){
        return app(args, puts, state, db, app_context);
    }
    // dataapp(db, args, puts)
}
loadApp('guess', './app/guess.js');
console.log('apps', Apps)

Aliases.dark = 'config bg 000 fg fff';
Aliases.light = 'config bg fff fg 000';
Aliases.small = 'config rows 13 cols 25';
Aliases.medium = 'config rows 19 cols 54';
Aliases.large = 'config rows 28 cols 75';
Aliases.xlarge = 'config rows 40 cols 115';
Aliases.tall = 'config rows 33 cols 54';

HelpMessages.help = "Show help for a command. Example: \"help config\".";

Commands.help = function(state, args, puts){
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
                    row.push(list[i]); }
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
        return; }
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



HelpMessages.config =
  "Edit config.\n" + 
  " Example: \"config rows 25 cols 65\"\n" +
  " Type 'config' with no arguments to see current config.\n";

// Commands modify state in place, apps do not.
Commands.config = function(args, puts, state){
    if(args.length == 1){
        let index = 0;
        for(var k in state.config){
            puts(k + " " + state.config[k]); }
        return; }
    let config_str = args.slice(1).join(" ");
    if(!config_regex.test(config_str)){
        puts("'config' only allows alphanumeric values.");
        return; }
    let new_config = parseConfig(config_str);
    let config_props = parseConfig(DEFAULT_CONFIG);
    let filtered = {};
    for(let k in new_config){
        if(k in config_props){
            filtered[k] = new_config[k]; }
        else{
            puts("Invalid config property '" + k + "'"); }}
    state.config = mergeMap(state.config, filtered);
    puts("config changes:");
    for(let k in filtered){
        puts(" " + k + " " + filtered[k]); }
}

// second map overwrites first.
function getKeys(obj){
    let keys = [];
    for(let k in obj){
        keys.push(k); }
    return keys;
}
function mergeIntoMap(result, a){
    for(let k in a){
        result[k] = a[k]; }
    return result;
}
function mergeMap(a, b){
    let result = {};
    for(let k in a){
        result[k] = a[k]; }
    for(let k in b){
        result[k] = b[k]; }
    return result;
}

// config is a whitespace separated list of tuples
// "property1 value1 property2 value2"
function parseConfig(config_str){
    let array = config_str.split(/\s+/);
    let result = {};
    for(let i=0; i<array.length - 1; i += 2){
        let key = array[i];
        let value = array[i + 1];
        result[key] = value;
    }
    return result;
}


function dumpConfig(config){
    let result_array = [];
    for(let k in config){
        let value = config[k];
        result_array.push(k);
        result_array.push(value);
    }
    return result_array.join(' ');
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
        // console.log('hist[i]', hist[i]);
        result_array.push(hist[i].map(function(s){ return s.trim()}).join("\n"));
    }
    return result_array.join(NEW_CONTEXT) + "\n";
}

let server = http.createServer(function(request, response){
    let data  = {
        "title": "cmd",
        "config" : parseConfig(DEFAULT_CONFIG),
        "cmd_out" : DEFAULT_CMDOUT,
        "base_cmd_out" : "",
        "cmd_hist" : parseHist(DEFAULT_HIST),
        "app_name" : "",
        "app_state" : "",
    }

    if(request.method == "GET"){
        response.writeHead(200, {"Content-Type": "text/html"});
        cmdPage(data);
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
        request.on('end', function(){
            let formData = qs.parse(requestBody);
            // console.log('secret_input', formData.secret_input);

            // santize all form fields for html characters.
            for(let k in formData){
                formData[k] = escapeHtml(formData[k]); }

            let cmd_text = "";
            // handle form data to modify local variables and 
            data.passwords = [];
            for(var i=0; true; ++i){
                let field_name = PASSWORD_FIELD_PREFIX + i;
                if(!formData[field_name]){
                    break; }
                data.passwords.push(formData[field_name]);
            }
            // console.log('remove this debugging only!!! Passwords: ' + data.passwords.join(', '));
            if(formData.config){
                let post_config = parseConfig(formData.config);
                data.config = mergeMap(data.config, post_config);
            }
            if(formData.cmd_out){
                data.cmd_out = formData.cmd_out;
            }
            if(formData.base_cmd_out){
                data.base_cmd_out = formData.base_cmd_out;
            }
            if(formData.cmd_hist){
                data.cmd_hist = parseHist(formData.cmd_hist);
            }
            // TODO do we want an app stack?
            // when an app in the app stack returns,
            // the child app_name and child app_state
            // are passed as extra parameters to the app.
            if(formData.app_name){
                data.app_name = formData.app_name;
            }
            if(formData.app_state){
                data.app_state = formData.app_state;
            }
            if(formData.cmd_text){
                data.cmd_text = formData.cmd_text;
                if(data.cmd_text.length){
                    if(!data.cmd_hist){
                        data.cmd_hist = [[]]; }
                    if(!data.cmd_hist.length){
                        data.cmd_hist.push([]); }
                    let last_hist_item = lastHistItem(data.cmd_hist);
                    if(data.cmd_text != last_hist_item){
                        data.cmd_hist[data.cmd_hist.length - 1].push(data.cmd_text); }
                }
            }

            let puts = function(s){ data.cmd_out += "\n" + s; }
            handleCommand(data, data.cmd_text, puts);
            cmdPage(data);
        });
    }
    function handleCommand(data, cmd_text, puts){
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
            data.cmd_out = ""; }
        else{
            if(data.app_name == "" && (cmd in Apps)){
                data.base_cmd_out = data.cmd_out;
                data.cmd_out = `'${cmd}' started. Type 'exit' to exit.\n`;
                data.app_name = cmd;
                data.cmd_hist.push([]); // add a new layer of history.
                // when entering app, remove appname from args
                args = args.slice(1);
                data.app_state; }
            if(data.app_name.length){
                if(cmd == "exit"){
                    data.cmd_out = data.base_cmd_out;
                    data.cmd_out += "\n'" + data.app_name + "' terminated.";
                    data.base_cmd_out = "";
                    data.app_state = "";
                    console.log('cmd_hist', data.cmd_hist);
                    data.cmd_hist.pop(); // remove a layer of history.
                    data.app_name = ""; }
                else{
                    // TODO handle data_context config parameter.
                    // TODO handle app_context.
                    data.app_state = Apps[data.app_name](args, puts, data.app_state); }}
            else if(cmd in Commands){
                // data.app_name = "test app_name";
                Commands[cmd](data, args, _puts); }
            else{
                puts(" Unknown command: '" + cmd + "'"); }}
        // wrap puts to start all lines with a space.
        function _puts(s){ puts(' ' + s); }
    }
    // closure for rendering the page.
    function cmdPage(data){
        let template_data = {};

        template_data.title = data.title;

        let cmd_list = [];
        cmd_list = cmd_list.concat(getKeys(Commands));
        cmd_list = cmd_list.concat(getKeys(Aliases));
        cmd_list = cmd_list.concat(getKeys(Apps));
        template_data.cmd_list = cmd_list.join(' ');
        let cmd_out_lines = data.cmd_out.split("\n");
        if(cmd_out_lines.length >= data.config.rows){
            cmd_out_lines = cmd_out_lines.slice(cmd_out_lines.length - data.config.rows + 1);
        }
        template_data.cmd_out = cmd_out_lines.join("\n");
        template_data.base_cmd_out = data.base_cmd_out;
        // console.log('cmd_hist', data.cmd_hist);
        template_data.cmd_hist = dumpHist(data.cmd_hist);
        template_data.config = dumpConfig(data.config);
        template_data.app_name = data.app_name;
        template_data.app_state = data.app_state;

        // add config vars to rendering data context.
        for(let key in data.config){
            template_data[key] = data.config[key];
        }

        response.writeHead(200, {"Content-Type": "text/html"});
        let html = cmd_page(template_data);
        response.end(html);
    }
})

server.listen(PORT);

console.log(`Server running on port ${PORT}.`);
