
module.exports = cookieJarApp;
// TODO handle arbitrary precision integer strings.

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
// users {id: {currency_name: balance}}
// checks {check_id: {currency_name, amount, from, to, time1, time2}}
//  for debugging purposes, checks store 'from', and 'to' information as well as 'time1' and 'time2'.
//  if debug is off, this information is omitted.
//  if debug is off, checks are deleted as soon as they are redeemed.
//  checks without 'to' have not been redeemed yet.
// currencies {name: owner_id}
// XXXX account: {balance: X, check_ids: []}
//  check_ids with 'issue:' prefix, mean it was issued directly into this account.
//  if debug is off, no check_ids are stored.
//
// user_accounts 
// TODO use site cookies to verify and backup.
const GREETING =
`CookieJar Digital Currency Exchange
-- Speed, privacy, and decentralized anonymized backups --
===========================
`;

const HELP =
`Possible actions:
  sitecookie - sets the sitecookie, used to authenticate and anonymize backups.
  create [currency] - creates a new currency and makes you the issuing authority.
  issue [currency] [amount] - issues [amount] of [currency] to your account.
  send [currency] [amount] - create a new check for [amount] of [currency].
  accept [check_id] - accept a check from another user.
  account - show the balances of currencies in your account.
  claim [backup_hash] - TODO claim backed up accounts
  backup - Anonymize and backup all server accounts.
`

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

const ALPHANUMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LEN = 18;
function randstr(chars, len){
    let s = "";
    for(let i=0; i<len; ++i){
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}


function cookieJarApp(args, call, data){
    let puts = call.puts;
    let user_state = Default({site_cookie: null}, data.user_state);
    let site_cookie = user_state.site_cookie;
    let user_key = data.user_key;
    let passwords = data.passwords;
    let app_state = Default(COOKIEJAR_INITSTATE, data.app_state);
    let users = app_state.users;
    let checks = app_state.checks;
    let currencies = app_state.currencies;
    let user_accounts = users[user_key] = Default({}, users[user_key]);
    let action = args[0];

    function error(msg){
        throw new Error(msg);
    }
    function checkArgs(args){
        let check = [];
        for(let i=1; i<arguments.length; ++i){
            check[i-1] = arguments[i]; }
        if(args.length != check.length + 1){
            throw new Error(`action requires ${check.length} arguments: ` + check.join(", "));
            // TODO check currency_name is a valid string, and amount is a valid integer string.
        }
    }
    // sets the user's 'sitecookie' used with this site
    if(data.entering_app && args.length == 1){
        puts(GREETING);
        puts(HELP);
    }
    else if(action == "sitecookie"){
        checkArgs(args)
        if(passwords.length != 1){
            error('site cookie requires password field.'); }
        // TODO check that site cookie has proper format and proper prefix for this site.
        // if not, direct them to the site cookie generating web page.
        user_state.site_cookie = passwords[0];
    }
    else if(site_cookie === null){
        error("You must set sitecookie before performing other actions.");
    }
    // create a currency [currency_name] -> success
    else if(action == "create"){
        checkArgs(args, 'currency_name');
        let currency_name = args[1];
        if(currency_name in currencies){
            error(`currency ${currency_name} already exists.`); }
        currencies[currency_name] = user_key;
        user_accounts[currency_name] = 0;
        puts(`Currency '${currency_name}' created. You are the issuing authority.`);
    }
    // issue a new balance for an owned currency. [currency_name, amount] -> success
    else if(action == "issue"){
        checkArgs(args, 'currency_name', 'amount');
        let [currency_name, amount] = args.slice(1);
        let authority = currencies[currency_name];
        if(authority === undefined){
            error(`No such currency '${currency_name}'`); }
        if(authority != user_key){
            error(`You are not the issuing authority for '${currency_name}'`); }
        amount = parseInt(amount);
        if(amount <= 0 || isNaN(amount)){
            error(`Invalid issue amount '${amount}'`); }
        user_accounts[currency_name] = Default(0, user_accounts[currency_name]);
        user_accounts[currency_name] += amount;
        puts(`You issued ${amount} units of currency '${currency_name}'.`);
    }
    // create a 'check' to send funds to another user. [currency_name, amount] -> check_id
    else if(action == "send"){
        checkArgs(args, 'currency_name', 'amount');
        let [currency_name, amount] = args.slice(1);
        amount = parseInt(amount);
        let balance = Default(0, user_accounts[currency_name]);
        if(amount <= 0 || isNaN(amount)){
            error(`Check amount must be positive: ${amount}`); }
        if(balance < amount){
            error(`Insufficient funds. Amount: ${amount}, Balance: ${balance}`); }
        let check_id = "";
        do{
            check_id = randstr(ALPHANUMS, ID_LEN);
        }while(check_id in checks);
        // create check and remove balance from account.
        checks[check_id] = {currency_name: currency_name, amount: amount};
        user_accounts[currency_name] = balance - amount;
        puts(`check '${check_id}' created, for ${amount} units of '${currency_name}'.`);
        puts(`Balance of ${currency_name} remaining : ${balance - amount}`);
    }
    // accept a 'check' from another user. [check_id] -> [currency_name, amount]
    else if(action == "accept"){
        checkArgs(args, 'check_id');
        let check_id = args[1];
        if(!(check_id in checks)){
            error(`unknown check '${check_id}'.`); }
        let check = checks[check_id];
        let currency_name = check.currency_name;
        if(!(currency_name in currencies)){
            error(`check for unknown currency '${currency_name}'`); }

        let amount = check.amount;
        if(amount <= 0 || isNaN(amount)){
            error(`invalid check amount '${balance}'`); }

        let balance = Default(0, user_accounts[currency_name]);
        if(balance < 0 || isNaN(balance)){
            error(`invalid account balance '${balance}'`); }

        user_accounts[currency_name] = balance + amount;
        delete checks[check_id];
        puts(`accepted check '${check_id}' for ${amount} units of '${currency_name}'.`);
        puts(`Balance of ${currency_name} : ${balance + amount}`);
    }
    // lists a users account balances and transactions.
    else if(action == "account"){
        checkArgs(args); // no extra arguments besides action
        for(let currency in user_accounts){
            let balance = user_accounts[currency];
            puts(`${currency} : ${balance}`); }
    }
    // claims a backed up account for this user.
    else if(action == "claim"){
        puts("TODO write claim account.");
    }
    // if authorized, backs up all accounts anonymously.
    else if(action == "backup"){
        puts("TODO write backup action.");
    }
    else {
        puts(HELP);
        if(action != 'help'){
            error("Unknown action '" + action + "'."); }
    }

    return {user_state: user_state, app_state: app_state};
}
