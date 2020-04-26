
const db = require('./db.js');

tests();

function tests(){
    callback_test();
    promise_test();
}

function callback_test(){
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
                    db.dump((err, str)=>{console.log('data', str)});
                    db.save(null, ()=>{console.log('db saved')});
                    if(err){ console.error(err); return; }
                    console.log('user set. uid: ' + uid);
                    db.getIds('user|', (err, ids)=>{
                        console.log('user ids: ', ids.join(', ')); })
                })
            })
        })
    })
}

async function promise_test(){
    let db = require('./db.js').promiseAPI;
    try{
        await db.set('a', 7);
        let a_value = await db.get('a');
        console.log('a_value', a_value);
    } catch(err) {
        console.error('promise_test() Error:', err);
    }
}

