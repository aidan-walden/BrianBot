const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const audioconcat = require('audioconcat');

client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
});
let voiceChannel, dispatcher = null;
let ttsActive = false;
let ttsQueue = [];
let voice = "Brian";
let volume = 1.0;

const TTSTypes = Object.freeze({
	TWITCH: Symbol("twitch"),
	HALFLIFE: Symbol("hl")
});

class TTSMessage {
	constructor(message, type){
		this.message = message;
		this.type = type;
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function speakText(TTSMsg) {

	if (TTSMsg.message.channel.type !== 'text') return;
	
	voiceChannel = TTSMsg.message.member.voice.channel;
	
	if (voiceChannel == null) {
		return TTSMsg.message.reply('Please join a voice channel first!');
	}


	if (ttsActive) {
		ttsQueue.push(TTSMsg);
		return TTSMsg.message.reply('TTS already active! Your query has been added to the queue.');
	}
	
	const connection = await voiceChannel.join();
	ttsActive = true;
	let text;
	if (TTSMsg.message.content.startsWith('!tts')) {
		text = TTSMsg.message.content.slice(5).trim();
	}
	else if (TTSMsg.message.content.startsWith('!hltts')) {
		text = TTSMsg.message.content.slice(7).trim();
	}
	else
	{
		text = TTSMsg.message.content.trim();
	}
	if(TTSMsg.type == TTSTypes.TWITCH) {
		//const stream = request();
		dispatcher = connection.play("https://api.streamelements.com/kappa/v2/speech?voice=" + voice + "&text=" + encodeURIComponent(text));
		if(dispatcher.volume != volume) dispatcher.setVolume(volume);
		dispatcher.on('finish', async function(){
			voiceChannel.leave()
			if (ttsQueue.length == 0) ttsActive = false;
			await sleep(500);
			while (ttsQueue.length > 0) {
				speakText(ttsQueue[0]);
				ttsQueue.splice(0, 1);
			}
		});
	}
	else if(TTSMsg.type == TTSTypes.HALFLIFE) {
		words = text.split(" ");
		for(var i = 0; i < words.length; i++) {
			if(words[i].charAt(0) !== '_' && (words[i].charAt(words[i].length - 1) == ',') || (words[i].charAt(words[i].length - 1) == '.')) {
				if(words[i].charAt(words[i].length - 1) == ',') {
					words.splice(i + 1, 0, '_comma');
				}
				else if(words[i].charAt(words[i].length - 1) == '.') {
					words.splice(i + 1, 0, '_period');
				}
				words[i] = words[i].substring(0, words[i].length - 1);
			}
		}
		for(var i = 0; i < words.length; i++) {
			let word = words[i];
			fs.access("sound/soldier/" + word + ".mp3", err => {
				if (err) {
					TTSMsg.message.reply("ERROR: Unknown sound: " + word);
					return;
				}
			});
		}
		let filePaths = [];
		for(var i = 0; i < words.length; i++) {
			filePaths.push("sound/soldier/" + words[i] + ".mp3");
		}
		if(words.length > 1){
			let newAudioPath = Date.now() + ".mp3";
			audioconcat(filePaths)
			.concat(newAudioPath)
			.on('start', function(command) {
			})
			.on('end', function (output) {
				dispatcher = connection.play(newAudioPath);
				if(dispatcher.volume != volume) dispatcher.setVolume(volume);
				dispatcher.on('finish', async function(){
					fs.unlink(newAudioPath, err => {
						if (err) {
							console.error(err)
						}
					});
					voiceChannel.leave()
					if (ttsQueue.length == 0) ttsActive = false;
					await sleep(500);
					while (ttsQueue.length > 0) {
						speakText(ttsQueue[0]);
						ttsQueue.splice(0, 1);
					}
				});
			})
		}
		else
		{
			dispatcher = connection.play(filePaths[0]);
			if(dispatcher.volume != volume) dispatcher.setVolume(volume);
			dispatcher.on('finish', async function(){
				voiceChannel.leave()
				if (ttsQueue.length == 0) ttsActive = false;
				await sleep(500);
				while (ttsQueue.length > 0) {
					speakText(ttsQueue[0]);
					ttsQueue.splice(0, 1);
				}
			});
		}
	}

	
}

client.on('message', message => {
	if (message.author.id != client.user.id) {
		if (message.content == '!skiptts') {
			if(!ttsActive) return;
			voiceChannel.leave();
			ttsActive = false;
		}
		else if (message.content.startsWith('!hltts')) {
			speakText(new TTSMessage(message, TTSTypes.HALFLIFE));
		}
		else if (message.content.startsWith('!tts') || message.channel.id == "643505937033723914") {
			speakText(new TTSMessage(message, TTSTypes.TWITCH));
		}
		else if (message.content.startsWith('!voice')) {
			voice = message.content.split("!voice ")[1];
			message.reply("Voice changed to " + voice);
		}
		else if (message.content.startsWith('!vol')){
			volume = Math.abs(parseFloat(message.content.split('!vol ')[1]));
			if(dispatcher != null){
				if(dispatcher.volume != volume) dispatcher.setVolume(volume);
			}
			message.reply("Volume set to " + volume);
		}
		/*else if (message.content.startsWith('!play ')) {
			if (message.member.voice.channel) {
				let url = message.content.split("!play ")[1];
				const connection = message.member.voice.channel.join();
				dispatcher = connection.play(url);
				dispatcher.on('finish', () => {
					connection.disconnect();
				  });
			}
			else {
				message.reply("You need to be in a voice channel!");
			}
		  }
		  */
	}
	
});


