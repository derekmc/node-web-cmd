
module.exports = cookieJarApp;

// root_cookie is a private cookie stored by each user.
// site_id is a long, randomly generated identifier unique to this site.
// root_cookies have a special prefix

// site_cookie is the cookie token a user uses with a specific site.
//  it is hash(root_cookie + site_id).

// backup_hash = hash(site_cookie + destination_site_id)
// account_backup = hash(currency_name + backup_version + backup_hash)  // backup_hash is not revealed until users want to redeem their backed up accounts
// the backup version is incremented every time a specific destination
//  site calls for a backup.

// backups list balances associated with a hashed 'account_backup' identifier.
// users must supply backup_hash to claim accounts
//  on a remote site, which the remote site can use
//  to identify all the associated account_backup's.
// the currency on the remote site may be mapped to a different name or use a namespace.


// user_state {site_cookie, user_id}
// users may choose whether to store their root cookie on this site,
// defaults to not.

// Checks are used for transfering funds,
//  originating or destination accounts.
// app_state {users, checks, currencies} 
// users {id: {accounts: {currency_name: account}}}
// checks {check_id: {currency_name, amount, from, to, time1, time2}}
//  for debugging purposes, checks store 'from', and 'to' information as well as 'time1' and 'time2'.
//  if debug is off, this information is omitted.
//  if debug is off, checks are deleted as soon as they are redeemed.
//  checks without 'to' have not been redeemed yet.
// currencies {name: owner_id}
// account: {balance: X, check_ids: []}
//  check_ids with 'issue:' prefix, mean it was issued directly into this account.
//  if debug is off, no check_ids are stored.
//
// user_accounts 
// TODO use site cookies to verify and backup.

const COOKIEJAR_INITSTATE = {
    users: {},
    checks: {},
    currencies: {},
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
    // TODO, this should be done directly with an exposed API call, and not a command line call.
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
    // claims a backed up account for this user.
    else if(action == "claim"){
    }
    // if authorized, backs up all accounts anonymously.
    else if(action == "backup"){
    }
    else {
        error("Unknown action '" + action + "'.");
    }

    return {user_state: user_state, app_state: state};
}
