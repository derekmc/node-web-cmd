
const db = require('./db.js');

db.load(null, ()=>{
    db.genKey({prefix:'user|'}, null, (err,uid)=>{
        if(err){ console.error(err); return; }
        db.set('user|' + uid, {name: 'derek', id: uid}, ()=>{
            console.log('user set. uid: ' + uid);
            db.save(null, ()=>{console.log('db saved')});
            db.getIds('user|', (err, ids)=>{
                console.log('user ids: ', ids.join(', ')); })
        })
    })
})

