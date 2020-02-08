# node-web-cmd
_See also: php-web-cmd._

Easily create webapps that provide minimal but usable command line interface that runs in-browser over the 'net.

Most webapps, are simply a limited, permissioned, or controlled way to edit a database.
All the forms and menus and popups and navigation, are just workflows for editing
a database in a specific way(you could say this about all computing tasks honestly,
it's just editing data in a controlled way).

To dramatically simplify the development of such webapps,
node-web-cmd provides a framework for building minimal but highly
usable webapps with an in-browser command line UI.  The app developer
simply needs to implement a callback for each action or command,
and then the framework handles the tricky parts:

### Tricky Stuff (automatically handled by the framework):
 * Virtual terminal in-brower interface.
 * Command history.
 * Command output.
 * Http stuff like POST requests.
 * Saving state to a database or storing state in the browser as a hidden input.

### Easy stuff (this is your job):
To write a webcall action, you implement a simple command callback function that accepts a list of
text arguments, a 'puts' function for writing output, and optionally a state argument.


```javascript
// Return: updated state
// Parameters:
//  args - the split command string
//  puts - use this to print text to 'stdout' (shows in the 
//  state - optional. useful for a webcall that is an app or otherwise has persistent state.
function commandCallback(args, puts, state){
    puts("\nExample command output from 'commandCallback'.");
    if(!state){
      state = {callCount: 0};
    }
    ++state.callCount;
    return state;
}
```

Normally, the result is then added to the virtual terminal page in the users browser.

However, there will also be an options to render a raw text result.  This will make the same
commands directly usable by client webapps that handle direct POST requests.


## TODO use [revision-db](https://github.com/derekmc/revision-db) for writing more involved webapps.
```javascript
function advancedCallback(args, puts, db){
    if(args[0] == 'usermod'){
        let user = args[1];
        db.getAll('user|' + user, function(kvr){
           db.setAll('user|' + user, function(){
           })
        })
    }
}
```
