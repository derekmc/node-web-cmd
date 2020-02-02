
let http = require('http');
let fs = require('fs');
let template = require('lodash')._.template;

let cmd_page = template(fs.readFileSync('./views/cmd_page.html'));

let server = http.createServer(function(req, res){
    res.writeHead(200, {"Content-Type": "text/html"});
	let data  = {
		"title": "This is the title!!!!!",
		"row_count" : 19,
		"col_count" : 53,
		"cmd_out" : "buffer data",
	}
    let html = cmd_page(data);
    res.end(html);
})
server.listen(8000);

console.log("Server running on port 8000");
