const express = require('express');

let app = express();

//setup pagination middleware so page return is not listing 1000 results.
const paginate = require('express-paginate');

// Set up body parser for JSON submissions
app.use(require('body-parser').urlencoded({extended: true}));

// Mongoose options
let options = { server: { socketOptions: { keepAlive: 1 } } };

// Set up first mongoose connection
let mongoose1 = require('mongoose');
let db1 = mongoose1.createConnection('mongodb+srv://webdevmurphy789:564Wa218351@cluster0.dnydb.mongodb.net/votebot?retryWrites=true&w=majority', options);
let Race = require('./models/race.js')(db1);

// Set up second mongoose connection
let mongoose2 = require('mongoose');
let db2 = mongoose2.createConnection('mongodb+srv://webdevmurphy789:564Wa218351@cluster0.dnydb.mongodb.net/tally?retryWrites=true&w=majority', options);
let Vote = require('./models/vote.js')(db2);

// Set up third mongoose connection
let mongoose3 = require('mongoose');
let db3 = mongoose3.createConnection('mongodb+srv://webdevmurphy789:564Wa218351@cluster0.dnydb.mongodb.net/votestorage?retryWrites=true&w=majority', options);
let Tally = require('./models/tally.js')(db3);

// Open the connections
db1.on('error', console.error.bind(console, 'connection error:'));
db1.once('open', function() { console.log("db1 connected"); });

db2.on('error', console.error.bind(console, 'connection error:'));
db2.once('open', function() { console.log("db2 connected"); });

db3.on('error', console.error.bind(console, 'connection error:'));
db3.once('open', function() { console.log("db3 connected"); });

// set up handlebars view engine
let handlebars = require('express-handlebars')
	.create({ defaultLayout:'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

//set environment
app.set('port', process.env.PORT || 3000);

//Set static directory
app.use(express.static(__dirname + '/public'));

//paginate to break up results from db
app.use(paginate.middleware(10, 50));

//Start Routes

app.get('/', function(req, res) {

	res.render('login');
});

app.post('/ballot', function(req,res){
	
	// Make sure the form contains a district and voter id
	if(req.body.voterId && req.body.district){
		console.log(" req.body.voterId has a :: voter id: " + req.body.voterId + " and req.body.district has a :: district: " + req.body.district);
     
     	//parse district from ballot form to int type. 
		const districtInt = parseInt(req.body.district);
      
        //find the state race 0, and the district race 'then' output the results as foundRaces
		Race.find({ $or: [ {districts: 0},{districts:[districtInt]} ] }).then(function(foundRaces){
			res.render('ballot', {
					voterId: req.body.voterId,
					district: districtInt,
					races: foundRaces
			});
	//catch to 'catch' if there is an error
		}).catch(function(err){
			console.log(err);
			res.redirect('/'); //TODO: Ideally we should display an error page here
		});
		}else{
			res.redirect('/login');
	}
	        //Otherwise, redirect the user to the login screen once again.
});



/*Make get the poll information from the form body
Make a copy of the body and save to database
then acknowledge the submission */
app.post('/vote', function(req, res){
	
	//create a new object to store vote results 
	const votes = Object.assign({}, req.body);
	//remove voterId and district 
	delete votes.voterId;
	delete votes.district;
	
	//Stringify to see what is going on in req.body
	console.log(JSON.stringify(req.body));
	
	//Try to map 3rd database as key values for vote results, did not work as intended
	//it did save it as an array though.
	let result = Object.keys(votes).map(function(key) {
    return [String(key), votes[key]];
});

console.log(result);
	
	//Find one document where voterId is the same as req.body.voterId
	Vote.findOne({voterId: req.body.voterId}).then(function(foundResults){
		
		console.log(foundResults);
    //if the document returns does not return null, 
	if(foundResults && foundResults.length != 'null'){
		
		
		//send to already voted
		res.render('alreadyVoted');
		
	}else{
		//Go ahead and create a new Vote with the below parameters, then save to the database.
		new Vote({voterId: req.body.voterId, district: req.body.district, votes: votes}).save().then(function(savedVote){
			console.log(savedVote);
		
		
		//Test tally db trying to strip, or convert: remove this before turn in.
		new Tally({votes: result}).save().then(function(savedTally){
			console.log(savedTally);
		});
		
			
			//Render the vote page.
			res.render('vote');
		   });
    	}
	});
});


//Display results of the Poll
app.get('/results', function(req,res,next){
//setup paginate variables
	var perPage = 10;
	var page = req.params.page || 1;
//setup for paginate find pages, set page limit middleware
	Vote.find()
	.skip((perPage * page) - perPage)
	.limit(perPage)
	.then(function(allResults)
	 {
	Vote.countDocuments().exec(function(err,countDocuments){
		if (err) return next(err)
		
	//Count the Documents: a Document represents a voter. 	
	Vote.countDocuments().then(function(ballotCount) {
		console.log(ballotCount);

//console output: trying to get individual candiate votes to tally and output.
//tried find({votes: Array}): find($Match {votes: ''}) .remove(uid) and a billion other ways.
Tally.find().then(function(tallyied){
	console.log(tallyied);
});


		//Display all the results, and the total votes counted, break results up into pages to fully work .ejs needs to be setup.
		res.render('results',{count: ballotCount, allResults: allResults, current: page,pages: Math.ceil(countDocuments / perPage)});
});
	});
} )	;
});


// 404 catch-all handler (middleware)
app.use(function(req, res, next){
	res.status(404);
	res.render('404');
});

// 500 error handler (middleware)
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
  console.log( 'Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.' );
});
