
exports.command = accountCmd;

const {
    GEN_NEW_USER,
    GUEST_ID,
    PASSWORD_SALT_LEN,
    PASSWORD_MINLENGTH,
    COOKIE,
    USER_NAMES,
    USER_SESSIONS,
    USER_INFOS,
    USER_ID_LEN,
    SALT_ROUNDS,
} = require("../const.js");

const bcrypt = require('bcrypt');
exports.help = 
  "User account commands.\n" + 
  " Commands: \n" + 
  "  user new <username> [password] [confirmpassword]\n" + 
  "  user login <username> [password]\n" +
  "  user logout <username> [password]\n" + 
  "  ? user delete <username> [password] [confirmpassword]\n"; 


// TODO rewrite callback style.
async function accountCmd(args, call, data){
    let puts = call.puts;
    let db = call.db;
    // let app_context = data.app_context? app_context;
    let passwords = data.passwords;
    let user_id = data.user_id;
    
    if(args.length < 2){
        if(data.user_id == GUEST_ID){
            puts("Guest user. Not logged in."); }
        if(data.user_info){
            puts("User: '" + data.user_info.username + "'"); }
        return;
    }
    let acct_cmd = args[1];
    // TODO secure_cookie secure_cookie_salt
    if(acct_cmd == "new"){
        if(args.length != 3){
            puts("'account new' too many or too few arguments, expected <username> only.");
            return; }
        if(data.user_id != GUEST_ID){
            puts("'account new' You must logout before creating a new account.");
            return; }
        if(passwords.length != 2){
            puts("'account new' requires 2 passwords to confirm password.");
            return; }
        // check username
        let username = args[2];
        let existing_user_id = await db.get(USER_NAMES + username);
        if(existing_user_id){
            puts("'account new' user exists: '" + username + "'");
            return; }
        if(passwords[0] != passwords[1]){
            puts("'account new' passwords do not match.");
            return; }
        if(passwords[0].length < PASSWORD_MINLENGTH){
            puts("'account new' password too short. Must be " + PASSWORD_MINLENGTH + " characters.");
            return; }
        let password_hash = await bcrypt.hash(passwords[0], SALT_ROUNDS);
        let user_info = {
            username: username,
            password_hash: password_hash,
        }
        let gen_id_args = {
            init: user_info,
            prefix: USER_INFOS,
            len: USER_ID_LEN,
        }
        let new_user_id = await db.genId(gen_id_args);
        let assign_keys = {
            username: USER_NAMES + username,
        }
        let assign_values = {
            username: new_user_id,
        }
        await db.set(assign_keys, assign_values);
        puts("Created user '" + username + "'. Try logging in.");
    }
    if(acct_cmd == "login"){
        if(args.length != 3){
            puts("'user login' too many or too few arguments, expected <username> only.");
            return; }
        if(data.user_id != GUEST_ID){
            puts("'user login' You must logout before logging into a new account.");
            return; }
        if(passwords.length != 1){
            puts("'user login' requires 1 password.");
            return; }

        let username = args[2];
        let login_user_id = await db.get(USER_NAMES + username);
        if(!login_user_id){
            puts("'user login' No such user '" + username + "'");
            return; }
        let user_info = await db.get(USER_INFOS + login_user_id);
        if(!user_info){
            puts("'user login' Could not retrieve user info '" + username + "'");
            return; }
        // the hash includes the salt.
        let password_match = await bcrypt.compare(passwords[0], user_info.password_hash);
        if(!password_match){
            puts("'user login' Incorrect password for '" + username + "'");
            return; }
        let assign_keys = {
            usersession: USER_SESSIONS + login_user_id,
            oldsession: USER_SESSIONS + data.user_id,
            cookie: COOKIE + data.session_cookie,
        }
        let assign_values = {
            usersession: data.session_cookie,
            oldsession: undefined,
            cookie: login_user_id,
        }
        await db.set(assign_keys, assign_values);
        puts("Logged in as '" + username + "'.");
    }
    if(acct_cmd == "logout"){
        if(data.user_id == GUEST_ID){
            puts("'account logout': You are not logged in.");
            return; }
        await db.set(
          [COOKIE + data.session_cookie, USER_SESSIONS + data.user_id],
          [GUEST_ID, undefined]);
        puts("Logged out.");
    }
    if(acct_cmd == "delete"){
        console.log("user delete");
    }
}
