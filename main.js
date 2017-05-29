var Eris = require("eris");
var util = require('util');
var loader = require('docker-config-loader'); //<3 wolke for making JSON ez again
var youtube = require('youtube-node');
var youtubedl = require('youtube-dl');
var mal = require('maljs');
var cleverbot = require('cleverbot');
var timestamp = require('console-timestamp');
var axios = require('axios')
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var winston = require('winston');

winston.add(winston.transports.File, {filename: 'logfile.log', level: 'error'});
winston.exitOnError = false;

//Requires cfg.json in that exact folder, dependent on node_modules location.
let config;
try {
    config = loader({secretName: 'config', localPath: './IslaBot.js/IslaBotJS/IslaBotJS/cfg.json'});
} catch (e) {
    winston.error(e);
    winston.error('Generally, failed to do config things.' + timestamp(' [MM-DD hh:mm:ss]'));
    process.exit(1);
}

//This is all Google API things, specifically logging in to use Google Sheets to store data.
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleap is.com-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), getBlacklist);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}
/**
 * Print Blacklist data.
 */
function getBlacklist(auth) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: auth,
    spreadsheetId: islaConfig.spreadsheetID,
    range: 'UserBlacklist!A2:B',
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    blrows = response.values;
    if (blrows.length == 0) {
      console.log('No data found on the sheet.');
    }else {
      console.log('Blacklisted UserIDs:');
      for (var i = 0; i < blrows.length; i++) {
        blrow = blrows[i];
        // Print columns A and B, which correspond to indices 0 and 1.
        console.log('%s', blrow[0]);
	  }
	}
  });
}

//That should be most of Google configuring things.
//Note to not fuck with Google's code until I actually understand the API properly.



//secret spooky token hiding thing
islaConfig = config;
bot = new Eris(islaConfig.token);

let opts = {
  maxResults: 1,
  key: 'islaConfig.apiKey'
  //also secret key hiding again kek
};

let cb = new cleverbot({
	key: islaConfig.cbKey
});
//Cleverbot keeps coming back to me, help.

let nani = require('nani').init(islaConfig.anilistID, islaConfig.anilistSecret)

//-------------------------------------------------------------------------------------------------
//AND NOW BACK TO YOU, **ACTUAL BOT COMMANDS**
//-------------------------------------------------------------------------------------------------

bot.on("ready", () => { // When the bot is ready
	console.log('\n');
    winston.info("[READY]: All should be well. Fire when ready." + timestamp(' [MM-DD hh:mm:ss]')); //Say when it's "ready"
});

currentPrefix = "+";

botMention = islaConfig.botName;
playCommand = currentPrefix + "play";
pingCommand = currentPrefix + "ping";
animeSearchCommand = currentPrefix + "asearch";
cleverbotCommand = currentPrefix + "cleverbot";
logCommand = currentPrefix + "forcelog";
ahCommand = currentPrefix + "ah";
helpCommand = currentPrefix + "help";
restartCommand = currentPrefix + "restart";
showblCommand = currentPrefix + "showBlacklist";
showrawvarCommand = currentPrefix + "showGlobalVar"

bot.on("messageCreate", (msg) => 	{ // When a message is created
	let start = msg.timestamp;
	if(msg.content.startsWith(pingCommand)) { // and starts with "+ping"
		msg.channel.createMessage('Pong!').then(sendedMsg => { //Create the message to check
            let diff = (sendedMsg.timestamp - start); //Check that message
			sendedMsg.edit(`Pong! | Delay = \` ${diff}ms\``); //edit that message to say the ping in ms.
			winston.debug("[PING]: Ping sent. " + diff + "ms." + timestamp(' [MM-DD hh:mm:ss]'));
		});
	}
});

bot.on("messageCreate", (msg) =>	{ // When a message is created
    if(msg.content.startsWith(playCommand)) { // If the message content starts with "+play "
	var searchTerm = msg.content.substring(playCommand.length + 1); // Get the filename
        if(msg.content.length <= 0) { // Check if a filename was specified
            bot.createMessage(msg.channel.id, "Please specify link or video title.");
            return;
        }
        if(!msg.channel.guild) { // Check if the message was sent in a guild
            bot.createMessage(msg.channel.id, "This command can only be run in a server.");
            return;
        }
        if(!msg.member.voiceState.channelID) { // Check if the user is in a voice channel
            bot.createMessage(msg.channel.id, "You are not in a voice channel.");
            return;
        }
		bot.joinVoiceChannel(msg.member.voiceState.channelID).catch((err) => { // Join the user's voice channel
			bot.createMessage(msg.channel.id, "Error joining voice channel: " + err.message); // Notify the user if there is an error
			winston.warn(err); // Log the error
		}).then((connection) => { //If all goes well
        if(connection.playing) { // Stop playing if the connection is playing something
            connection.stopPlaying();
        }
		winston.debug("Youtube Search: " + searchTerm);
		youtube(searchTerm, opts, function(err, results) {
			if(err) return winston.warn(err);
			winston.debug("Results: " + results);
			winston.debug("-----------RESULTS ABOVE-------------");
			videoLink = 'http://www.youtube.com/watch?=' + results.items.videoId
			winston.debug("URL: " + videoLink);
		});
		video = youtubedl(videoLink);
		video.on('info', function(info)	{
			winston.debug("Download started");
			winston.debug("filename: " + info.filename);
			winston.debug("size: " +	info.size);
		}).then((connection) => {
			if(connection.playing)	{
				connection.stopPlaying(); //around!
			}
			connection.play(video.pipe(fs.createWriteStream(info.filename)));
			bot.createMessage(msg.channel.id, `Now playing **$(filename)**`);
			connection.once("end", () =>	{
				bot.createMessage(msg.channel.id, `Finished **$(filename)**`);
				});
			});
        });
    }
});
//}

/*bot.on("messageCreate", (msg) =>	{ // When a message is created
    if(msg.content.startsWith(animeSearchCommand)) { // If the message content starts with "+asearch"
		if(msg.content.length <= animeSearchCommand.length + 1) { // Check if a search term was specified
			console.log("[ASEARCH]: Non-Fatal - No Search Query Given." + timestamp(' [MM-DD hh:mm:ss]'));
			bot.createMessage(msg.channel.id, "Error: | `Please specify a search term.`");
			return;
		}
		if(!msg.channel.guild) { // Check if the message was sent in a guild
			console.log("[ASEARCH]: Non-Fatal - Command can only be run in guilds." + timestamp(' [MM-DD hh:mm:ss]'));
            bot.createMessage(msg.channel.id, "This command can only be run in a server.");
			return;
		}
		
		//Now I'm gonna be honest here, I couldn't figure this out. So uh, this is an adaptation from Wolke's code. Sorry I'm not original.
		var searchterm = msg.content.substring(animeSearchCommand.length + 1); // Get the search term
		console.log("[ASEARCH]: Searching for " + searchterm + timestamp(' [MM-DD hh:mm:ss]'));	
		authRequest = axios.post(`https://anilist.co/api/auth/access_token`, {
                grant_type: 'client_credentials',
                client_id: islaConfig.anilistID,
				client_secret: islaConfig.anilistSecret
		});
		accessToken = authRequest.data.access_token;
		var animeRequest = axios({
                url: `https://anilist.co/api/anime/search/$searchterm`,
                params: {access_token: accessToken}
		});
		console.log(animeRequest);
	}
});*/


bot.on("messageCreate", (msg) =>	{//You know how this goes by now.
	if(msg.content.startsWith(cleverbotCommand))	{
		if(msg.content.length <= cleverbotCommand.length + 1) {
			winston.warn("[CLEVERBOT]: No Query Given." + timestamp(' [MM-DD hh:mm:ss]'));
			bot.createMessage(msg.channel.id, "Error: | `If you're gonna talk to CleverBot, have something to say.`");
			return;
		}
		//My goal was to make a cool system here that had a session for each person, but cleverbot.io's responses are unbearable.
		let question = msg.content.substring(cleverbotCommand.length + 1);
		cb.query(question)
		.then(function (response)	{
			let answer = response.output
			bot.createMessage(msg.channel.id, ":pen_ballpoint: | " + response.output);
		});
	}
});
//:french_bread: Paradox was here

//Unfortunately cleverbot.io is retarded and it's responses are garbage.
//EDIT: Unfortunately, cleverbot.com is retarded too now. I'll ask tuturu about his new provider.
bot.on("messageCreate", (msg) =>	{//You know how this goes by now.
	if(msg.content.startsWith(botMention))	{
		if(msg.content.length <= botMention.length + 1) {
			winston.warn("[CLEVERBOT]: Non-Fatal - No Query Given." + timestamp(' [MM-DD hh:mm:ss]'));
			bot.createMessage(msg.channel.id, "Error: | `If you're gonna talk to CleverBot, have something to say.`");
			return;
		}
		if(!msg.channel.guild) {
			winston.warn("[CLEVERBOT]: Command can only be run in guilds." + timestamp(' [MM-DD hh:mm:ss]'));
            bot.createMessage(msg.channel.id, "Error: | `This command can only be run in a server.`");
			return;
		}
		//My goal was to make a cool system here that had a session for each person, but cleverbot.io's responses are unbearable.
		let question = msg.content.substring(botMention.length + 1);
		cb.query(question)
		.then(function (response)	{
			let answer = response.output
			bot.createMessage(msg.channel.id, ":pen_ballpoint: | " + response.output);
		});
	}
});
		
		
bot.on("messageCreate", (msg) =>	{		
	if(msg.content.startsWith(logCommand))	{
		let query = msg.content.substring(logCommand.length + 1);
		if(msg.content.length <= logCommand.length + 1) {
			winston.warn("[FORCELOG]: No Query Given." + timestamp(' [MM-DD hh:mm:ss]'));
			bot.createMessage(msg.channel.id, "Error: | `Please give a query.`");
			return;
		}
		msg.channel.createMessage("Logging `" + query + "`");
		winston.warn('[FORCELOG]: Query - "' + query + timestamp('" [MM-DD hh:mm:ss]'));
	}
});

bot.on("messageCreate", (msg) =>	{
	if(msg.content.startsWith(ahCommand))	{
		if(msg.content.length <= ahCommand.length + 1)	{
			bot.createMessage(msg.channel.id, "AH?");
			return;
		}
		let multiplier = parseInt(msg.content.substring(ahCommand.length + 1));
		if((multiplier >= 1999) || (multiplier <= 0))	{
			bot.createMessage(msg.channel.id, "AHH! No, Senpai!");
			return;
		}
		let h = "H"
		let result = "A" + h.repeat(multiplier) + "!"
		bot.createMessage(msg.channel.id, result);
	}
});	

bot.on("messageCreate", (msg) =>	{
	if(msg.content.startsWith(helpCommand))	{
		if(msg.content.length <= helpCommand.length + 1)	{
			let data = {
				"content": "*Hey... getting to the point here...*",
				"embed": {
					"title": "I'm IslaBot! *The bot developed only using 1 JS file.*",
					"description": "I was made by <@!156192749354221568>,\nwho was inspired by the many works of others around me!\nI was also inspired by people who extended their bots to several different files, and how neat it was.",
					"color": 3263930,
					"url": "https://anilist.co/anime/20872/PlasticMemories",
					"thumbnail": {
						"url": "https://gothicreviews.files.wordpress.com/2015/05/pm6.png"
					},
					"fields": [
					{
						"name": "+help",
						"value": "What you're viewing right now! Below are *most likely*  the currently known commands!"
					},
					{
						"name": "+play",
						"value": "This is still under development. Sorry!"
					},
					{
						"name": "+ping",
						"value": "pings the bot. Useful if you're curious why it is slow, or if it is live or not.\nKeep in mind, Owner-Senpai is hosting this himself without any servers, so don't be rude!"
					},
					{
						"name": "+ah",
						"value": "Makes an AHH. Can be given arguments to multiply the length. Ex. +ah 10"
					},
					{
						"name": "+forcelog",
						"value": "Forces a query into my logs. Useful for leaving bug reports or giving thanks to Owner-Senpai!"
					},
					{
						"name": "+cleverbot",
						"value": "Talk to a cleverbot! Note that the responses you get will most likely make no sense, nothing Owner-Senpai can do. Can also be activated by mention."
					},
					{
						"name": "+asearch",
						"value": "Also in development, sorry again! This searches for an anime using AniList.co."	
					}
				]
				}
			}
			bot.createMessage(msg.channel.id, data);
		}
	}
}); 
//Work in progress. Grabs user ID of current user, or id of mentioned user.
/*bot.on("messageCreate", (msg) =>	{
	if(msg.content.length <= uidCommand.length + 1)	{
		bot.createMessage(msg.channel.id, `Sure, it's **$(msg.author.id)**, **$(msg.author.nickname)**!`);
	}
	if(msg.content.length >= uidCommand.length + 1)	{
		var query = msg.content.substring(uidCommand.length + 1);
		query.
*/	
 
bot.on("messageCreate", (msg) => {
	if(msg.content.startsWith(showblCommand))	{
		if(msg.author.id == islaConfig.ownerID) {
			let blclockcounter = 0
			if(blclockcounter = 0)	{
				bcklist = blrows + " "
				blclockcounter = blclockcounter + 1
			}else {
			let list = bcklist.split(",")
			let list2 = list.join("\n") 
			bot.createMessage(msg.channel.id, "Blacklisted users: ```\nUserID:\n" + list2 + " ```");
			}
		}else {
			bot.createMessage(msg.channel.id, `Only Owner-Senpai can use this command!`);
		}
	}
});
 
bot.on("messageCreate", (msg) => {
	let query = msg.content.substring(showrawvarCommand.length + 1);
	if(msg.content.startsWith(showrawvarCommand))	{
		if(msg.author.id == islaConfig.ownerID) {
			bot.createMessage(msg.channel.id, "Raw value of global variable: ```\n" + global[query] + " ```");
		}else {
			bot.createMessage(msg.channel.id, `Only Owner-Senpai can use this command!`);
		}
	}
});


bot.connect();
