
const db = require('./db.js');

db.load(null, ()=>{
    let args = {
        idRef: "SALT",
        len: 12,
    }
    db.genId(args, (err, salt)=>{
        console.log('err', err, 'salt', salt);
        let username = 'joe';
        let username_key = 'username|' + username;
        let args = {
            prefix: 'user|',
            init: {name: username},
        }
        db.genId(args, (err,uid)=>{
            db.set(username_key, uid, (err)=>{
                console.log('username_key, uid', username_key, uid);
                db.dump((str)=>{console.log('data', str)});
                db.save(null, ()=>{console.log('db saved')});
                if(err){ console.error(err); return; }
                console.log('user set. uid: ' + uid);
                db.getIds('user|', (err, ids)=>{
                    console.log('user ids: ', ids.join(', ')); })
            })
        })
    })
})

