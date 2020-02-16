
const db = require('./db.js');

db.load(null, ()=>{
    let username = 'joe';
    let username_key = 'username|' + username;
    let args = {
        prefix: 'user|',
        idRef: username_key,
        init: {name: username},
    }
    db.genId(args, (err,uid)=>{
        if(err){ console.error(err); return; }
        console.log('user set. uid: ' + uid);
        db.save(null, ()=>{console.log('db saved')});
        db.getIds('user|', (err, ids)=>{
            console.log('user ids: ', ids.join(', ')); })
    })
})
let args = {
    idRef: "SALT",
    refOnly: true,
    len: 12,
}
db.genId(args, ()=>0);
db.save(null, ()=>{console.log('db saved')});
