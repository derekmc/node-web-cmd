# node-web-cmd
Interactive online command line in browser.

Most webapps, are simply a limited, permissioned or controlled way to edit a database.

To dramatically simplify such webapp develop node-web-cmd(see also: php-web-cmd),
this project handles all the http stuff, saving of state, and command parsing, so writing 
a webapp is as easy as writing simple command line utilities, if not easier.

To write a webcall, you simply implement a command callback function that accepts a list of
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
