
module.exports = accountApp;

// TODO only sudo apps accept password inputs.
accountApp.is_sudo = true;
// TODO rewrite callback style.
function accountApp(args, puts, state, db, app_context, passwords){
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
}
