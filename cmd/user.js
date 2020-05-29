
exports.command = accountCmd;

const {
    GEN_NEW_USER,
    LOGIN_USER,
    GUEST_ID,
    PASSWORD_SALT_LEN,
    PASSWORD_MINLENGTH,
} = require("../const.js");

exports.help = 
  "User account commands.\n" + 
  " Commands: \n" + 
  "  user new <username> [password] [confirmpassword]\n" + 
  "  user login <username> [password]\n" +
  "  user logout <username> [password]\n" + 
  "  ? user delete <username> [password] [confirmpassword]\n"; 

const ALPHANUMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function randstr(chars, len){
    let s = "";
    for(let i=0; i<len; ++i){
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

// TODO rewrite callback style.
function accountCmd(args, call, data){
    let puts = call.puts;
    let db = call.db;
    // let app_context = data.app_context? app_context;
    let passwords = data.passwords;
    
    if(args.length < 2){
        if(data.user_id == GUEST_ID){
            puts("Guest user. Not logged in."); }
        if(data.user_info){
            puts("User: '" + data.user_info.username + "'"); }
        return;
    }
    let acct_cmd = args[1];
    if(acct_cmd == "new"){
        if(args.length != 3){
            puts("'account new' too many or too few arguments, expected <username> only.");
            return; }
        if(data.user_id != GUEST_ID){
            puts("'account new' You must logout before creating a new account.");
            return; }
        if(passwords.length != 2){
            puts("'account new' requires 2 password inputs to confirm password.");
            return; }
        if(passwords[0] != passwords[1]){
            puts("'account new' passwords do not match.");
            return; }
        if(passwords[0].length < PASSWORD_MINLENGTH){
            puts("'account new' password too short. Must be " + PASSWORD_MINLENGTH + " characters.");
            return; }
        data.user_id = GEN_NEW_USER;
        let username = args[2];
        // console.log(password_salt, password_hash);
        data.user_info = {
            username: username,
        }
        puts("Created user '" + username + "'. Try logging in.");
    }
    if(acct_cmd == "login"){
        if(args.length != 3){
            puts("'account login' too many or too few arguments, expected <username> only.");
            return; }
        if(data.user_id != GUEST_ID){
            puts("'account login' You must logout before logging into a new account.");
            return; }
        if(passwords.length != 1){
            puts("'account login' requires 1 password only.");
            return; }

        let username = args[2];
        data.user_info = {
            username: username,
        }
        data.user_id = LOGIN_USER;
        puts("Attempting login as '" + username + "'.");
    }
    if(acct_cmd == "logout"){
        console.log("user logout");
    }
    if(acct_cmd == "delete"){
        console.log("user delete");
    }
}
