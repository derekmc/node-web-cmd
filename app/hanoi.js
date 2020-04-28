
module.exports = hanoiApp;

const INIT_STATE = {turn: 0, towers: [[5,4,3,2,1],[],[]]};
const GREETING =
`Tower of Hanoi Puzzle game
===========================`;
const HELP_MSG =
` You are trying to move the tower,
  to bring about the end of the world.
 To move a disc, type the origin name,
  and destination tower name.

Example: a b`;


function parseState(s){
    if(s === null || s === undefined || s.length == 0){
        return INIT_STATE; }
    let rows = s.trim().split("\n");
    let turn = parseInt(rows[0]);

    let towers = rows[1].trim().split(";").map(
        tower => tower.trim().split(",").map(
            disc => parseInt(disc)));

    towers = towers.map(tower =>
        isNaN(tower[0])? [] : tower)
    //console.log(towers);

    return {turn: turn, towers: towers};
}
function dumpState(state){
    return state.turn + "\n" + state.towers.map(tower => tower.join(",")).join(';');
}
function printState(state, puts){
    puts("Turn: " + state.turn);
    puts("Towers: ");
    // console.log('state', JSON.stringify(state));
    puts(state.towers.map((tower, i) => " " + ['a', 'b', 'c'][i] + "> " + tower.join(" ")).join('\n'));
}

// Game is finished when all discs are moved from one of the original towers to a new tower.
function isFinished(state){
    return (state.towers[0].length == 0 && (state.towers[1].length == 0 || state.towers[2].length == 0));
}

function towerIndex(name){
    let index = {a: 0, b: 1, c: 2}[name];
    if(isNaN(index)){
        throw new Error("Invalid tower name: " + name); }
    return index;
}

function hanoiApp(args, puts, data){
    // throw 'test error2';
    let user_state = data.user_state;
    let state = parseState(user_state);
    let msg = "";
    // first run
    if(user_state == null || user_state == "" || data.entering_app){
        msg += GREETING;
        msg += "\n" + HELP_MSG;
        msg += "\n";
    }
    else if(args.length > 0){
        // throwing an error prevents any state change.
        if(args.length != 2){
            throw "You must type two tower names to move the disc."; }
        let towers = state.towers;
        let from = towers[towerIndex(args[0])];
        let to = towers[towerIndex(args[1])];
        if(from.length == 0){
            throw "Tower is empty."; }
        let disc = from.pop();
        // console.log('disc, to', disc, to);
        if(to.length && to[to.length - 1] < disc){
            throw "Cannot stack bigger disc on smaller disc."; }
        to.push(disc);
        ++state.turn;
        if(isFinished(state)){
            msg += "\nTower Finished.";
            msg += "\nThe world is not ending.";
            msg += "\nCongratulations, on the apocalypse.";
            msg += "\n\nType 'reset' to reset.";
            printState(state, puts);
            puts(msg);
            return {user_state: dumpState(state)};
        }
    }
    puts(msg);
    printState(state, puts);
    //puts("TODO: handle moves.", move);

    return {user_state: dumpState(state)};
}
