
module.exports = guessApp;

const DEFAULT_MAX = 100;
function randint(n){
    return 1 + Math.floor(n * Math.random());
}

function guessApp(args, puts, data){
    let max, n, guesses, max_guesses;
    let state = data.app_state;
    let session_token = data.session_token;
    if(state == null){
        state = {};
    }
    let user_state = (session_token in state)? state[session_token] : "";
    if(user_state == ""){
        max = (args.length > 0 && parseInt(args[0]) > 0)? parseInt(args[0]) : DEFAULT_MAX;
        n = randint(max)
        guesses = -1;
        max_guesses = Math.max(1, Math.floor(Math.log2(max) - 0.285));
    }
    else{
        let data = user_state.split(/,\s*/);
        max = parseInt(data[0]);
        n = parseInt(data[1]);
        guesses = parseInt(data[2]);
        max_guesses = parseInt(data[3]);
    }
    ++guesses;
    guess = -1
    msg = `Guess a number from 1 to ${max}.`;
    if(guesses > 0){
        if(args.length < 1){
            --guesses; }
        else{
            guess = parseInt(args[0]);
            if(guess != n && guesses == max_guesses){
                msg = ` You Lose! The number was ${n}. 😢`; }
            else if(guess < n){ msg = " Higher."; }
            else if(guess > n){ msg = " Lower."; }
            else if(guess == n){ msg = " You Won! 🏆\n Enter new maximum to play again."; }
        }
    }
    remaining = max_guesses - guesses;

    if(guess == n || remaining == 0){
        user_state = ""; }
    else{
        msg += ` You have ${remaining} more tries.`;
        user_state = [max, n, guesses, max_guesses].join(', ');
    }
    puts(msg);
    state[session_token] = user_state;
    return state;
}
