

// TODO use big integer library for account balances, etc.
// TODO use a proper database instead of 'app_state', for scalability.

// root_cookie is a private cookie stored by each user.
// site_id is a long, randomly generated identifier unique to this site.
// root_cookies have a special prefix

// site_cookie is the cookie token a user uses with a specific site.
// site_cookie = hash(site_id + root_cookie).

// backup_hash = hash(originating_site_cookie + destination_site_id + backup_version) // accounts cannot be linked to other backup versions.
// account_hash = hash(currency_name + backup_hash)  // backup_hash is not revealed until users want to redeem their backed up accounts
// the backup version is changed every time a specific destination
//  site calls for a backup.
// check_hash = hash(check_id + originating_site_id + destination_site_id + backup_version)

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
// app_state {site_cookies, users, checks, currencies, site_id} 
// users {id: {site_cookie, action_log, accounts: {currency_name: balance}}}
//   -- user action_log can be turned on of off, and is not backed up to other services.
// checks {check_id: {currency_name, amount}}
//  for debugging purposes, checks store 'from', and 'to' information as well as 'time1' and 'time2'.
//  if debug is off, this information is omitted.
//  if debug is off, checks are deleted as soon as they are redeemed.
//  checks without 'to' have not been redeemed yet.
// currencies {name: {owner_id, supply, locked}}
// backup_versions {destination_site_id : {version_id}}
// backups: {backup_version: {
//     timestamp,
//     originating_site_id,
//     destination_site_id,
//     // see notes at top of file for hash information.
//     accounts: [{account_hash, balance}],
//     checks: [{check_hash, currency_name, amount}],
//  }}
//  check_ids with 'issue:' prefix, mean it was issued directly into this account.
//  if debug is off, no check_ids are stored.
//
// user_info.accounts 
// TODO use site cookies to verify and backup.

module.exports = cookieJarApp;
const shajs = require('sha.js');
const CURRENCY_REQUIRE_ADMIN = true; // require admin privileges to create a new currency(but not issue or lock)

function sha256(s){
    return new shajs('sha256').update(s).digest('base64');
}

const BackupInfo = {
    site_cookie: "",
    originating_site_id: "",
    destination_site_id: "",
    backup_version: "",
}
/*
*/

function checkHash(check_id, backup_info){
    let info = backup_info;
    let siteA = info.originating_site_id;
    let siteB = info.destination_site_id;
    let version = info.backup_version;
    return sha256(check_id + siteA + siteB + version);
}

function backupHash(backup_info){
    let info = backup_info;
    let cookieA = info.site_cookie;
    let siteB = info.destination_site_id;
    let version = info.backup_version;
    return sha256(cookieA + siteB + version);
}

function accountHash(currency_name, backup_hash){
    return sha256(currency_name + backup_hash);
}

// This function doesn't actually need the backup version
function generateBackup(data, backup_info){
    // T(BackupInfo, backup_info);
    let timestamp = "TODO timestamp";
    // let timestamp = "" + (new Date()).now();

    let result = {
        timestamp: timestamp,
        backup_version: backup_info.backup_version,
        originating_site_id: backup_info.originating_site_id,
        destination_site_id: backup_info.destination_site_id,
        accounts: [],
        checks: []
    }
    
    let users = data.users;
    for(let user_id in users){
        let backup_hash = backupHash(backup_info);
        let accounts = users[user_id].accounts;
        for(let currency_name in accounts){
            let balance = accounts[currency_name];
            let account_hash = accountHash(currency_name, backup_hash);
            let backup_account_info = {account_hash, balance}
            result.accounts.push(backup_account_info);
        }
    }
    let checks = data.checks;
    for(let check_id in checks){
        let check_hash = checkHash(check_id, backup_info);
        let check_info = checks[check_id];
        let currency_name = check_info.currency_name;
        let amount = check_info.amount
        let backup_check_info = {check_hash, currency_name, amount};
        result.checks.push(backup_check_info);
    }
    return result;
}

const GREETING =
`CookieJar Digital Currency Exchange
-- Speed, privacy, and decentralized anonymized backups --
===========================
`;

// TODO allow users to turn an action history on or off, that records a log
// of all their actions which affect state.
const HELP =
`Site Actions:
  info - More information on CookieJar.
  siteid - Display this site's Site ID.
  backup (destid) - Anonymize and backup all server accounts
   for specified (destid) destination site id.
  supply - Show the total supply of each currency.

Issuer Actions:
  create (currency) (supply) - Creates a new currency
  issue (currency) (amount) - Issues (amount) of (currency).
  lock (currency) - prevents issuing new supply of currency.

User Actions:
  newuser - Generates new rootcookie and sitecookie. (WARNING)
  sitecookie - Sets the sitecookie.
  send (currency) (amount) - Create check for (amount) of (currency).
  accept (check_id) - Accept a check from another user.
  account - Show the balances of currencies in your account.
  claim (backup_hash) - TODO claim backed up accounts
`;

const INFO =
`Cookie Jar is a minimalist currency exchange server.
In contrast with most cryptocurrencies, it relies
on a trusted, centralized, service provider, but with
the benefit of decentralized and anonymized backups.
This allows the service provider to be replaced in
case of failure, without losing transactions or
account balances since the last backup.

If the trusted service provider proves unreliable,
the community may choose a new service provider,
in which case, users will have to claim their backed
up accounts on the new service.

Backups anonymize account data using hashes for
privacy. Every balance, per currency type and user,
is identified as a distinct record with a unique
hash, which cannot be linked to other records,
except by the new service provider after the user
claims their accounts.
`

// const ALPHANUMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
// alphanumerics except O 0 or l
const ID_CHARS = "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
const ID_LEN = 20;
const SHORT_ID_LEN = 10; // used locally only.
const ID_REGEX = /^[A-Za-km-z1-9]{20}$/;
const ROOT_COOKIE_PREFIX = "ROOT";
const ROOT_COOKIE_REGEX = /^ROOT[A-Za-km-z1-9]{20}$/;
const SITE_PREFIX = "SITE";
const CHECK_PREFIX = "";
const SITE_REGEX = /^SITE[A-Za-km-z1-9]{20}$/;
// matches length 256 base64 hashes.
const HASH256_REGEX = /^(?:[A-Za-z0-9+\/]{4}){10}(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/

function genUserID(){
    return randstr(ID_CHARS, SHORT_ID_LEN);
}
function genSiteID(){
    return SITE_PREFIX + randstr(ID_CHARS, ID_LEN);
}
function genCheckID(){
    return CHECK_PREFIX + randstr(ID_CHARS, ID_LEN);
}
function genRootCookie(){
    return ROOT_COOKIE_PREFIX + randstr(ID_CHARS, ID_LEN);
}

function checkSiteID(s){
    if(typeof s != "string") return false;
    return null != s.match(SITE_REGEX);
}
function checkRootCookie(s){
    if(typeof s != "string") return false;
    return null != s.match(ROOT_COOKIE_REGEX);
}
function checkSiteCookie(s){
    if(typeof s != "string") return false;
    return null != s.match(HASH256_REGEX);
}

function initCookieJar(){
    return {
        site_cookies: {},
        users: {},
        checks: {},
        currencies: {},

        // backups: {backup_version: {
        //     timestamp,
        //     originating_site_id,
        //     // see notes at top of file for hash information.
        //     accounts: [{account_hash, balance}],
        //     checks: [check_hash]}}
        backups: {}, 
        site_id: genSiteID(),
    };
}

function Default(def, value){
    if(value == "" || value === null || value === undefined){
        if(typeof def == "function"){
            return def(); }
        else{
            return def; }}
    return value;
}

function randstr(chars, len){
    let s = "";
    for(let i=0; i<len; ++i){
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

// creates user for site_cookie if non-existent.
// returns the user_id.
function createUser(app_state, user_state, site_cookie){
    let user_id = "";
    if(!checkSiteCookie(site_cookie)){
        throw new Error("site_cookie invalid format."); }

    if(site_cookie in app_state.site_cookies){
        user_state.site_cookie = site_cookie;
        return app_state.site_cookies[site_cookie];
    }
    do {
        user_id = genUserID();
    } while(user_id in app_state.users);
    
    app_state.site_cookies[site_cookie] = user_id;
    app_state.users[user_id] = {site_cookie: site_cookie, accounts:{}};
    user_state.site_cookie = site_cookie;
    return user_id;
}


function cookieJarApp(args, call, data){
    let puts = call.puts;
    let user_state = Default({site_cookie: null}, data.user_state);
    let site_cookie = user_state.site_cookie;
    // let user_key = data.user_key;
    let passwords = data.passwords;
    let app_state = Default(initCookieJar, data.app_state);
    let users = app_state.users;
    let checks = app_state.checks;
    let currencies = app_state.currencies;
    let action = args[0];

    function error(msg){
        throw new Error(msg);
    }
    function checkArgs(args){
        let check = [];
        for(let i=1; i<arguments.length; ++i){
            check[i-1] = arguments[i]; }
        if(args.length != check.length + 1){
            throw new Error(`action requires ${check.length} arguments: ` + check.join(", ") + ".");
            // TODO check currency_name is a valid string, and amount is a valid integer string.
        }
    }

    // Welcome
    if(data.entering_app && args.length == 1){
        puts(GREETING);
        puts(HELP);
    }
    else if(action == "info"){
        puts(INFO);
    }
    else if(action == "help"){
        puts(HELP);
    }
    // Site Actions
    else if(action == "siteid"){
        puts("Site ID: " + app_state.site_id);
    }
    else if(action == "supply"){
        let has_currencies = false;
        let user_id = (site_cookie === null || site_cookie == "")? null : app_state.site_cookies[site_cookie];
        for(let currency_name in currencies){
            has_currencies = true;
            let currency_info = currencies[currency_name];

            if(currency_info === undefined){
                error(`Unexpected error: Could not find data on currency '${currency_name}'`); }
            let is_issuer = user_id == currency_info.issuer_user_id;
            let is_locked = currency_info.locked;

            puts(`${currency_name} : ${currency_info.supply}`
              + (is_issuer? " (issuer)" : "")  + (is_locked? " (locked)" : ""));
        }
        if(!has_currencies){
            puts("No currencies created.");
        }
    }
    else if(action == "newuser"){
        checkArgs(args);

        puts("Warning: It is recommended to use a 3rd party tool to handle rootcookies.");
        root_cookie = ROOT_COOKIE_PREFIX + randstr(ID_CHARS, ID_LEN);
        puts();
        puts("STORE THE ROOTCOOKIE, IT CANNOT BE RECOVERED.");
        puts("Root Cookie: " + root_cookie);

        site_cookie = sha256(app_state.site_id + root_cookie);
        createUser(app_state, user_state, site_cookie);
        puts("Site Cookie: " + site_cookie);
    }
    else if(false && action == "setroot"){
        checkArgs(args);
        // TODO remove this action entirely for security reasons, and prompt to use a 3rd party tool.
        puts("Warning: It is recommended to use a 3rd party tool to handle rootcookies.");
        let root_cookie = "";
        if(passwords.length != 1){
            error("'setroot' requires rootcookie in password field.");
        }
        root_cookie = passwords[0];
        if(!root_cookie.match(ROOT_COOKIE_REGEX)){
            puts(`Root cookie should have prefix ${ROOT_COOKIE_REGEX}`);
            puts(`Followed by ${ID_LEN} alphanumeric characters, excluding, 0, O, and l.`);
            error('Provided root cookie is not proper format. See output.');
        }
        site_cookie = sha256(app_state.site_id + root_cookie);
        createUser(app_state, user_state, site_cookie);
        puts("Site Cookie: " + site_cookie);
    }
    // sets the user's 'sitecookie' used with this site
    else if(action == "sitecookie"){
        checkArgs(args);
        if(passwords.length != 1){
            error('site cookie requires password field.'); }
        // TODO check that site cookie has proper format and proper prefix for this site.
        // if not, direct them to the site cookie generating web page.
        site_cookie = passwords[0];
        if(!checkSiteCookie(site_cookie)){
            puts("Site Cookie should be a base64 sha256 hash.");
            error("Site Cookie wrong format, not a a base64 sha256 hash.");
        }
        createUser(app_state, user_state, site_cookie);
    }
    else if(site_cookie === null || site_cookie == ""){
        error("You must set sitecookie before performing user or issuer actions.");
    }
    else {
        // user and issuer actions. user_id required.
        let user_id = app_state.site_cookies[site_cookie];
        if(!user_id) error("Unknown sitecookie.");
        let user_info = users[user_id];
        if(!user_info) error("Unexpectedly missing userinfo.");

        // ==== Issuer Actions ====
        // create a currency [currency_name] -> success
        if(action == "create"){
            if(args.length > 3) error("'create' takes at most 2 arguments.");
            let currency_name = args[1];
            if(currency_name in currencies){
                error(`currency ${currency_name} already exists. Try 'issue' command.`); }

            let init_supply = args.length > 2? parseInt(args[2]) : 0;
            if(init_supply < 0 || isNaN(init_supply)){
                error("'create' invalid supply: " + init_supply); }

            if(CURRENCY_REQUIRE_ADMIN && !data.is_admin){
                error("This server only allows admins to create new currencies."); }

            currencies[currency_name] = {issuer_user_id: user_id, supply: init_supply, locked: false};
            user_info.accounts[currency_name] = init_supply;
            puts(`Currency '${currency_name}' created with ${init_supply} units. You are the issuing authority.`);
        }
        // issue a new balance for an owned currency. [currency_name, amount] -> success
        else if(action == "issue"){
            checkArgs(args, 'currency_name', 'amount');
            let [currency_name, amount] = args.slice(1);
            let currency_info = currencies[currency_name];
            if(currency_info === undefined){
                error(`No such currency '${currency_name}'`); }
            if(currency_info.issuer_user_id != user_id){
                error(`You are not the issuing authority for '${currency_name}'`); }
            if(currency_info.locked){
                error(`'${currency_name}' is locked. Cannot issue more.`); }
            amount = parseInt(amount);
            if(amount <= 0 || isNaN(amount)){
                error(`Invalid issue amount '${amount}'`); }
            user_info.accounts[currency_name] = Default(0, user_info.accounts[currency_name]);
            user_info.accounts[currency_name] += amount;
            currency_info.supply += amount;
            puts(`You issued ${amount} units of currency '${currency_name}'.`);
            puts(`Balance of ${currency_name} : ${user_info.accounts[currency_name]}`);
        }
        else if(action == "lock"){
            checkArgs(args, 'currency_name');
            let currency_name = args[1];
            let currency_info = currencies[currency_name];
            if(currency_info === undefined){
                error(`No such currency '${currency_name}'`); }
            if(currency_info.issuer_user_id != user_id){
                error(`You are not the issuing authority for '${currency_name}'`); }
            currency_info.locked = true;
            puts(`Locked '${currency_name}'. You cannot issue more.`);
        }
        // ==== User Actions ====
        // create a 'check' to send funds to another user. [currency_name, amount] -> check_id
        else if(action == "send"){
            checkArgs(args, 'currency_name', 'amount');
            let [currency_name, amount] = args.slice(1);
            amount = parseInt(amount);
            let balance = Default(0, user_info.accounts[currency_name]);
            if(amount <= 0 || isNaN(amount)){
                error(`Send amount must be positive: ${amount}`); }
            if(balance < amount){
                error(`Insufficient funds. Send amount: ${amount}, Balance: ${balance}`); }
            let check_id = "";
            do{
                check_id = genCheckID();
            }while(check_id in checks);
            // create check and remove balance from account.
            checks[check_id] = {currency_name: currency_name, amount: amount};
            user_info.accounts[currency_name] = balance - amount;
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

            let balance = Default(0, user_info.accounts[currency_name]);
            if(balance < 0 || isNaN(balance)){
                error(`invalid account balance '${balance}'`); }

            user_info.accounts[currency_name] = balance + amount;
            delete checks[check_id];
            puts(`accepted check '${check_id}' for ${amount} units of '${currency_name}'.`);
            puts(`Balance of ${currency_name} : ${balance + amount}`);
        }
        // lists a users account balances and transactions.
        else if(action == "account" || action == "accounts"){
            checkArgs(args); // no extra arguments besides action
            for(let currency_name in user_info.accounts){
                let balance = user_info.accounts[currency_name];
                let currency_info = currencies[currency_name];
                if(currency_info === undefined){
                    error(`Unexpected error: Could not find data on currency '${currency_name}'`); }
                let is_issuer = user_id == currency_info.issuer_user_id;
                let is_locked = currency_info.locked;

                puts(`${currency_name} : ${balance}`
                  + (is_issuer? " (issuer)"  + (is_locked? " (locked)" : "") : "")); }
        }
        // claims a backed up account for this user.
        else if(action == "claim"){
            puts("TODO write claim account.");
        }
        // if authorized, backs up all accounts anonymously.
        else if(action == "backup"){
            checkArgs(args, "destination_site_id", "backup_version");
            let backup_info = {
                site_cookie: site_cookie,
                originating_site_id: app_state.site_id,
                destination_site_id: args[1],
                backup_version: args[2],
            }
            
            let backup_data = generateBackup(app_state, backup_info);
            puts(JSON.stringify(backup_data));
            // puts("TODO write backup action.");
        }
        else if(action !== undefined){
            puts(HELP);
            error("Unknown action '" + action + "'.");
        }
    }

    return {user_state: user_state, app_state: app_state};
}
