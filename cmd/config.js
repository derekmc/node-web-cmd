
const alphanum_regex = /^[A-Za-z0-9 ]*$/;
const DEFAULT_CONFIG = "rows 19 cols 54 fg 000 bg fff";
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
// config command.
exports.help = 
  "Edit config.\n" + 
  " Example: \"config rows 25 cols 65\"\n" +
  " Type 'config' with no arguments to see current config.\n";

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
exports.parseConfig = parseConfig;
function parseConfig(config_str){
    if(!config_str) return {};
    let array = config_str.split(/\s+/);
    let result = {};
    for(let i=0; i<array.length - 1; i += 2){
        let key = array[i];
        let value = array[i + 1];
        result[key] = value;
    }
    return result;
}


exports.dumpConfig = dumpConfig;
function dumpConfig(config){
    if((typeof config) != "object") throw new Error("config was not an object.");
    let result_array = [];
    for(let k in config){
        let value = config[k];
        result_array.push(k);
        result_array.push(value);
    }
    return result_array.join(' ');
}



exports.command = function(args, puts, data){
    if(args.length == 1){
        let index = 0;
        for(var k in data.user_config){
            puts(k + " " + data.user_config[k]); }
        return; }
    let config_str = args.slice(1).join(" ");
    if(!alphanum_regex.test(config_str)){
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
    data.user_config = mergeMap(data.user_config, filtered);
    puts("config changes:");
    for(let k in filtered){
        puts(" " + k + " " + filtered[k]); }
}
