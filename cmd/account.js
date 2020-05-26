
module.exports = accountApp;

// TODO rewrite callback style.
function accountApp(args, call, data){
    let state = data.app_state;
    // let app_context = data.app_context? app_context;
    let passwords = data.passwords;
    /*
    let args = params.args;
    let puts = params.puts;
    let state = params.state;
    let db = params.db;
    let app_context = params.app_context;
    let passwords = params.passwords;
    */

    if(!args.length) return;
    let cmd = args[0];
    if(cmd == "new"){
        
    }
    if(cmd == "login"){
    }
    if(cmd == "logout"){
    }
    if(cmd == "delete"){
    }

    return state;
}
