# node-web-cmd
_See also: php-web-cmd._

Interactive online command line in browser.

Most webapps, are simply a limited, permissioned or controlled way to edit a database.
The entire user inter

To dramatically simplify the development of such webapps,
we create a framework for providing a minimal but highly
usable command line UI, and then the framework handles the tricky parts:

 * Virtual terminal in-brower interface.
 * Command history.
 * Command output.
 * Http stuff like POST requests.
 * Saving state to a database or storing state in the browser as a hidden input.

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
