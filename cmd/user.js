
exports.command = userCmd;

const bcrypt = require('bcrypt');
const {
    GEN_NEW_USER,
    GUEST_ID,
    PASSWORD_SALT_LEN,
    PASSWORD_MINLENGTH,
    COOKIE,
    USER_NAMES,
    USER_SESSIONS,
    USER_INFOS,
    USER_CONFIGS,
    USER_ID_LEN,
    SALT_ROUNDS,
    ADMIN_PASSWORD_FILE
} = require("../const.js");

const admin = require("../admin.js");
const admin_file = ADMIN_PASSWORD_FILE;
let admin_list = null;

(async function(){
    admin_list = await admin.listAdmins(admin_file);
})();

exports.help = 
  "User commands.\n" + 
  " Commands: \n" + 
  "  user : display current logged in user. \n" + 
  "  user new <username> [password] [confirmpassword]\n" + 
  "  user login <username> [password]\n" +
  "  user logout <username> [password]\n" + 
  "  ? user delete <username> [password] [confirmpassword]\n"; 


// TODO rewrite callback style.
async function userCmd(args, call, data){
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
        return false;
    }
    let acct_cmd = args[1];
    // TODO secure_cookie secure_cookie_salt
    if(acct_cmd == "new"){
        if(args.length != 3){
            puts("'user new' too many or too few arguments, expected <username> only.");
            return false; }
        if(data.user_id != GUEST_ID){
            puts("'user new' You must logout before creating a new user.");
            return false; }
        if(passwords.length != 2){
            puts("'user new' requires 2 passwords to confirm password.");
            return false; }
        // check username
        let username = args[2].trim().toLowerCase();
        let user_exists_msg = "'user new' user exists: '" + username + "'or reserved for admin.";
        let existing_user_id = await db.get(USER_NAMES + username);
        if(existing_user_id){
            puts(user_exists_msg);
            return false; }
        if(passwords[0] != passwords[1]){
            puts("'user new' passwords do not match.");
            return false; }

        let is_admin = admin_list != null && admin_list.includes(username);
        if(is_admin){
            let admin_password_match = await admin.checkAdmin(admin_file, username, passwords[0]);
            if(!admin_password_match){
                // A timing attack might be possible here to discover if there is a reserved admin account.
                // this is a security concern.
                puts(user_exists_msg);
            }
        }
        else if(passwords[0].length < PASSWORD_MINLENGTH){
            puts("'user new' password too short. Must be " + PASSWORD_MINLENGTH + " characters.");
            return false;
        }
        let password_hash = await bcrypt.hash(passwords[0], SALT_ROUNDS);
        // a user is admin if and only if the admin login was set when the user account
        // was created.
        let user_info = {
            username: username,
            password_hash: password_hash,
            is_admin: is_admin,
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
        return true;
    }
    if(acct_cmd == "login"){
        if(args.length != 3){
            puts("too many or too few arguments, expected <username> only.");
            return false; }
        if(data.user_id != GUEST_ID){
            puts("You must logout before logging in as a different user.");
            return false; }
        if(passwords.length != 1){
            puts("requires 1 password.");
            return false; }

        let username = args[2].trim().toLowerCase();
        let login_user_id = await db.get(USER_NAMES + username);
        if(!login_user_id){
            puts("No such user '" + username + "'");
            return false; }
        let user_info = await db.get(USER_INFOS + login_user_id);
        if(!user_info){
        
            puts("Could not retrieve user info '" + username + "'");
            return false; }
        // the hash includes the salt.
        let password_match = await bcrypt.compare(passwords[0], user_info.password_hash);
        if(!password_match){
            puts("Incorrect password for '" + username + "'");
            return false; }
        else if(user_info.is_admin){
            let admin_password_match = await admin.checkAdmin(admin_file, username, passwords[0]);
            if(!admin_password_match){
                puts("admin password does not match user password.");
                return false;
            }
            data.is_admin = true;
        }
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
        data.user_name = username;
        data.user_key = login_user_id;
        puts("Logged in as '" + username + "'.");
        return true;
    }
    if(acct_cmd == "logout"){
        if(data.user_id == GUEST_ID){
            puts("'user logout': You are not logged in.");
            return false; }
        await db.set(
          [COOKIE + data.session_cookie, USER_SESSIONS + data.user_id],
          [GUEST_ID, undefined]);
        puts("Logged out.");
        data.user_name = "Guest";
        data.user_key = data.session_cookie;
        data.is_admin = false;
        // data.user_config = await db.get(USER_CONFIGS + data.session_cookie);
        return true;
    }
    if(acct_cmd == "delete"){
        console.log("user delete");
    }
}
