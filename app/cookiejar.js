
module.exports = cookieJarApp;

// root_cookie is a private cookie stored by each user.
// site_id is a long, randomly generated identifier unique to this site.
// root_cookies have a special prefix

// site_cookie is the cookie token a user uses with a specific site.
//  it is hash(root_cookie + site_id).

// backup_cookie is used to backup accounts to a different site.
// backup_cookie = hash(site_cookie + destination_site_id)
// account_backup_cookie = hash(currency_name + backup_version + backup_cookie)
// the backup version is incremented every time a specific destination
//  site calls for a backup.

// users should 'claim' their backup_cookie before it's needed,
//  and report falsely claimed backup cookies.
//  then they can associate that with their specific site_cookie on the destination site,
//  so that the 
// users may 'claim' backed up accounts on another site
//  claim backup_cookie

// user_state {site_cookie, user_id}
// users may choose whether to store their root cookie on this site,
// defaults to not.

// Checks are used for transfering funds,
//  originating or destination accounts.
// app_state {users, checks, currencies} 
// users {id: {accts: {currency_name: "0"}}}
// checks {check_id: ["currency_name", "positive_integer_amount"]}
// currencies {name: {owner_id, accounts: {user_id: user_accounts}}}
//
// user_accounts 
// TODO use site cookies to verify and backup.

const COOKIEJAR_INITSTATE = {
    currencies: {},
    users: {},
}
function Default(def, value){
    if(value == "" || value === null || value === undefined){
        return def; }
    return value;
}

function cookieJarApp(args, call, data){
    let puts = call.puts;
    let user_state = data.user_state;
    let state = Default(COOKIEJAR_INITSTATE, data.app_state);
    let action = args[0];

    function error(msg){
        throw new Error(msg);
    }
    function checkArgs(args){
        let check = arguments.slice(1);
        if(args.length != check.length + 1){
            throw new Error(`action requires ${check.length} arguments: ` + check.join(", "));
            // TODO check currency_name is a valid string, and amount is a valid integer string.
        }
    }
    // sets the user's 'sitecookie' used with this site
    if(action == "sitecookie"){
        checkArgs(args, 'cookie');
    }
    // create a currency [currency_name] -> success
    if(action == "create"){
        checkArgs(args, 'currency_name');
        let currency_name = args[1];
        if(currency_name
    }
    // issue a new balance for an owned currency. [currency_name, amount] -> success
    else if(action == "issue"){
        checkArgs(args, 'currency_name', 'amount');
        let [currency_name, amount] = args.slice(1);
    }
    // create a 'check' to give another user. [currency_name, amount] -> check_id
    else if(action == "give"){
        checkArgs(args, 'currency_name', 'amount');
        let [currency_name, amount] = args.slice(1);
    }
    // accept a 'check' from another user. [check_id] -> [currency_name, amount]
    else if(action == "accept"){
        checkArgs(args, 'check_id');
        let currency_name = args[1];
        let amount = args[2];
    }
    // lists a users account balances and transactions.
    else if(action == "accounts"){
        checkArgs(args); // no extra arguments besides action
    }
    // associates a backup_cookie with user.
    else if(action == "userclaim"){
    }
    // claims a specific account for this user.
    else if(action == "accountclaim"){
    // if authorized, backs up all accounts anonymously.
    else if(action == "backup"){
    }
    else {
        error("Unknown action '" + action + "'.");
    }

    return {user_state: user_state, app_state: state};
}
