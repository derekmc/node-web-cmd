
const fs = require('fs');
const bcrypt = require('bcrypt');

const {
    ADMIN_PASSWORD_FILE,
    SALT_ROUNDS,
} = require("./const.js");

const HELP =
`node admin.js (action)
    Actions:
      - add (username) (password)
` 

// detect if called from command line directly
if(require.main === module){
    main();
}

// note admins still have to create a normal account.

async function main(){
    let file = ADMIN_PASSWORD_FILE;

    if(process.argv.length < 3){
        console.log(HELP);
        process.exit();
    }

    let action = process.argv[2];

    // TODO for now, manually remove admin accounts.
    if(action == "add"){
        if(process.argv.length != 5){
            console.log("node admin.js add (username) (password): wrong number of user arguments " + process.argv.length - 3 + ".");
            process.exit();
        }
        let username = process.argv[3];
        let password = process.argv[4];
        let added = await addAdmin(file, username, password);
        let msg = added? `Admin '${username}' added.` : `Could not add admin '${username}'.`;
        console.log(msg);
    }
    if(action == "list"){
        console.log((await listAdmins(file)).join(", "));
    }
    if(action == "check"){
        if(process.argv.length != 5){
            console.log("node admin.js add (username) (password): wrong number of user arguments " + process.argv.length - 3 + ".");
            process.exit();
        }
        let username = process.argv[3];
        let password = process.argv[4];
        let checked = await checkAdmin(file, username, password);
        let msg = checked? `Valid admin credentials for '${username}'.` : `Invalid credentials or not an admin '${username}:${password}'.`;
        console.log(msg);
    }
}

exports.addAdmin = addAdmin;
exports.checkAdmin = checkAdmin;
exports.listAdmins = listAdmins;

async function addAdmin(filename, username, password){
    let admins = await listAdmins(filename);
    if(admins && admins.includes(username)){
        return false; }
    let password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    let user_line = "\n" + username + ":" + password_hash;
    let has_err = false;
    await fs.appendFile(filename, user_line, {encoding: 'utf-8'}, (err) => {
        if(err){
            has_err = true;
            throw err; }
    })
    return !has_err;
}


async function checkAdmin(filename, username, password){
    let result = await new Promise((resolve, reject) => {
        fs.readFile(filename, {encoding: 'utf-8'}, async (err, data) => {
            if(data){
                let rows = data.split("\n");
                for(let i=0; i < rows.length; ++i){
                    let row = rows[i];
                    let index = row.indexOf(":");
                    if(index >= 0){
                        let name = row.substr(0, index);
                        let hash = row.substr(index + 1);
                        if(name == username){
                            let password_match = await bcrypt.compare(password, hash);
                            resolve(password_match);
                            return;
                        }
                    }
                }
            }
            resolve(false);
        })
    })
    return result;
}

async function listAdmins(filename){
    let result = await new Promise((resolve, reject) => {
        fs.readFile(filename, {encoding: 'utf-8'},
          (err, data) => {
            if(data){
                resolve(data.split("\n").map( s => {
                    s = s.trim();
                    let i = s.indexOf(":");
                    if(i >= 0){
                        let name = s.substr(0, i);
                        return name;
                    }
                    return null;
                }).filter(x => x !== null));
            }
            resolve([]);
        })
    })

    return result;
}

