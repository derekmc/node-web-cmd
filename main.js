// TODO sanitize all fields, right now injection attacks are possible.

let http = require('http');
let fs = require('fs');
let qs = require('querystring');
let template = require('lodash')._.template;
let helpMessages = {};
let commands = {};
let apps = {};

let cmd_page = template(fs.readFileSync('./views/cmd_page.html'));
const NEW_CONTEXT = "\n==NEW CONTEXT==\n";
const config_regex = /^[A-Za-z0-9 ]*$/;

// config is a whitespace separated list of tuples
const DEFAULT_CONFIG = "rowcount 19 colcount 54 darkmode false";
const DEFAULT_HIST = "help";

// Commands are just apps that operate on the global state context,
// and not a localized state.

// TODO loadCommand and loadApp functions load apps or commands from a file and set their help messages.
// TODO a DataApp uses database callbacks like revision-db.
function loadCmd(filename){
}
function loadApp(filename){
}
function loadDataApp(filename){
}

helpMessages.config =
  "Edit config.\n" + 
  " Example: \"config darkmode true\"\n" +
  " Type 'config' with no arguments to see current config.\n";

// commands modify state in place, apps do not.
commands.config = function(state, args, puts){
    if(args.length == 1){
        let index = 0;
        for(var k in state.config){
            puts(k + " " + state.config[k]); }
        return; }
    let config_str = args.slice(1).join(" ");
    if(!config_regex.test(config_str)){
        puts("'config' only allows alphanumeric values.");
        return; }
    let change_config = parseConfig(config_str);
    state.config = mergeMap(state.config, change_config);
    puts("config changes:");
    for(let k in change_config){
        puts(" " + k + " " + change_config[k]); }
}

helpMessages.help = "Show help for a command. Example: \"help config\".";

commands.help = function(state, args, puts){
    if(args.length == 1){
        args.push('help'); }
    for(var i=1; i<args.length; ++i){
        let cmd = args[i];
        if(cmd in helpMessages){
            puts(cmd + ": " + helpMessages[cmd]); }
        else{
            puts("No help for '" + cmd + "'."); }
    }
}


// second map overwrites first.
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
        let hist_lines = ctx_str.split("\n\s*");
        result.push(hist_lines);
    }
    return result;
}

function dumpHist(hist){
    let result_array = [];
    if(!hist) return "";
    for(let i=0; i<hist.length; ++i){
        // console.log('hist[i]', hist[i]);
        result_array.push(hist[i].join("\n"));
    }
    return result_array.join(NEW_CONTEXT) + "\n";
}

let server = http.createServer(function(request, response){
    let data  = {
        "title": "cmd",
        "config" : parseConfig(DEFAULT_CONFIG),
        "cmd_out" : "Type 'help' for help.",
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
            let cmd_text = "";
            // handle form data to modify local variables and 
            if(formData.config){
                let post_config = parseConfig(formData.config);
                data.config = mergeMap(data.config, post_config);
            }
            if(formData.cmd_out){
                data.cmd_out = formData.cmd_out;
            }
            if(formData.cmd_hist){
                data.cmd_hist = parseHist(formData.cmd_hist);
            }
            // TODO do we want an app stack?
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
                    data.cmd_hist[data.cmd_hist.length - 1].push(data.cmd_text);
                }
            }

            let puts = function(s){ data.cmd_out += "\n" + s; }
            if(data.app_name.length){
                data.app_state = handleApp(data.app_name, data.cmd_text, puts, data.app_state); }
            else{
                handleCommand(data.cmd_text, puts, data); }

            cmdPage(data);
        });
    }
    function handleApp(app_name, cmd_text, puts, state){
        // TODO
    }
    function handleCommand(cmd_text, puts, data){
        if(!cmd_text) cmd_text = "";
        puts("> " + cmd_text);
        let args = cmd_text.split(/\s+/);
        if(!args.length) return;
        let cmd = args[0];
        if(cmd in commands){
            commands[cmd](data, args, function(s){ puts(" " + s); }); }
        else{
            puts(" Unknown command: '" + cmd + "'"); }
    }
    // closure for rendering the page.
    function cmdPage(data){
        let template_data = {};

        template_data.title = data.title;
        let cmd_out_lines = data.cmd_out.split("\n");
        if(cmd_out_lines.length >= data.config.rowcount){
            cmd_out_lines = cmd_out_lines.slice(cmd_out_lines.length - data.config.rowcount);
        }
        template_data.cmd_out = cmd_out_lines.join("\n");
        // console.log('cmd_hist', data.cmd_hist);
        template_data.cmd_hist = dumpHist(data.cmd_hist);
        template_data.config = dumpConfig(data.config);

        // add config vars to rendering data context.
        for(let key in data.config){
            template_data[key] = data.config[key];
        }

        let dark = data.config.darkmode === "true";
        template_data.background = dark? '000' : 'fff';
        template_data.foreground = dark? 'fff' : '000';

        response.writeHead(200, {"Content-Type": "text/html"});
        let html = cmd_page(template_data);
        response.end(html);
    }
})
server.listen(8000);

console.log("Server running on port 8000.");
