
let http = require('http');
let fs = require('fs');
let qs = require('querystring');
let template = require('lodash')._.template;

let cmd_page = template(fs.readFileSync('./views/cmd_page.html'));
const NEW_CONTEXT = "\n==NEW CONTEXT==\n";
const CONFIG_VARS = ['darkmode', 'rowcount', 'colcount'];

// second map overwrites first.
function mergeMap(a, b){
    let result = {};
    for(let k in a){
        result[k] = a[k]; }
    for(let k in b){
        result[k] = b[k]; }
    return result;
}

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
    console.log('hist', hist);
    if(!hist) return "";
    for(let i=0; i<hist.length; ++i){
        console.log('hist[i]', hist[i]);
        result_array.push(hist[i].join("\n"));
    }
    return result_array.join(NEW_CONTEXT) + "\n";
}

let server = http.createServer(function(request, response){
    let data  = {
        "title": "This is the title!!!!!",
        "config" : "rowcount 19 colcount 80 darkmode 1",
        "cmd_out" : "buffer data",
        "cmd_hist" : "help",
    }
    let config = parseConfig(data.config);
    let cmd_out = "";
    let cmd_hist = parseHist(data.cmd_hist); // TODO a stack of cmd_hist contexts.
    console.log('cmd_hist', cmd_hist);

    // console.log('config', config);

    if(request.method == "GET"){
        response.writeHead(200, {"Content-Type": "text/html"});
        mainPage();
    }
    if(request.method == "POST"){
        let requestBody = '';
        request.on('data', function(data){
            requestBody += data;
			if(requestBody.length > 1e7) {
			    response.writeHead(413, 'Request Entity Too Large', {'Content-Type': 'text/html'});
			    response.end('<!doctype html><html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>');
			}
        });
		request.on('end', function(){
            let formData = qs.parse(requestBody);
            // handle form data to modify local variables and 
            if(formData.config){
                let post_config = parseConfig(config_str);
                config = mergeMap(config, post_config);
            }
            if(formData.cmd_out){
                cmd_out = formData.cmd_out;
            }
            if(formData.cmd_hist){
                cmd_hist = parseHist(formData.cmd_hist);
            }

            // TODO replace test values with command callback processing.
            cmd_out += "\nTesting output message only.";
            if(cmd_hist && cmd_hist.length > 0){
                cmd_hist[cmd_hist.length - 1].push( "demo-test-command added to history for testing.");
            }

            console.log('config', config);
            console.log('data', data);
            mainPage();
        });
    }
    // closure for rendering the page.
    function mainPage(){
        data.cmd_out = cmd_out;
        data.cmd_hist = dumpHist(cmd_hist);
        data.config = dumpConfig(config);

        // add config vars to rendering data context.
        for(let i=0; i<CONFIG_VARS.length; ++i){
            let key = CONFIG_VARS[i];
            if(key in config){
                data[key] = config[key]; }
        }

        if(config.darkmode){
            data.background = '#000';
            data.foreground = '#fff';
        } else {
            data.background = '#fff';
            data.foreground = '#000';
        }

        response.writeHead(200, {"Content-Type": "text/html"});
        let html = cmd_page(data);
        response.end(html);
    }
})
server.listen(8000);

console.log("Server running on port 8000");
