"use strict";
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var mpg321 = require('mpg321');
var progress = require('request-progress');
var request = require('request');
var VoiceSpeed;
(function (VoiceSpeed) {
    VoiceSpeed[VoiceSpeed["Slow"] = -5] = "Slow";
    VoiceSpeed[VoiceSpeed["Normal"] = 0] = "Normal";
    VoiceSpeed[VoiceSpeed["Fast"] = 5] = "Fast";
})(VoiceSpeed || (VoiceSpeed = {}));
var config = {
    apiKey: '',
    audioCacheFolderName: '__audiocache__',
    volumeGain: 300
};
var createDirIfNotExist = function (dirName) {
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
        return true;
    }
    return false;
};
var procedure = {
    createAPIUrl: function (params) {
        return "https://api.voicerss.org/?key=" + params.key + "&src=" + params.text + "&hl=" + params.hl + "&r=" + params.speed + "&c=" + params.codec + "&f=" + params.format;
    },
    downloadMp3File: function (url) {
        return new Promise(function (resolve, reject) {
            var cacheDir = config.audioCacheFolderName;
            var hashedFilename = path.resolve(__dirname, "./" + cacheDir + "/" + md5(url) + ".mp3");
            if (fs.existsSync(hashedFilename)) {
                console.log('[Audio file exists in cache]');
                resolve(hashedFilename);
                return;
            }
            createDirIfNotExist(cacheDir);
            console.log("[Start to download audio from " + url + "]");
            progress(request({
                url: url,
                method: 'GET'
            }), {
                throttle: 500
            })
                .on('end', function () {
                resolve(hashedFilename);
            })
                .pipe(fs.createWriteStream(hashedFilename));
        });
    }
};
var voiceModule = {
    setup: function (apiKey) {
        if (apiKey) {
            config.apiKey = apiKey;
            return true;
        }
        return false;
    },
    speak: function (text) {
        return new Promise(function (resolve, reject) {
            var apiUrl = procedure.createAPIUrl({
                key: config.apiKey,
                text: encodeURIComponent(text),
                hl: 'zh-cn',
                speed: VoiceSpeed.Normal,
                codec: 'MP3',
                format: '48khz_16bit_stereo'
            });
            procedure.downloadMp3File(apiUrl)
                .then(function (hashedFilename) {
                var childProc = mpg321().gain(config.volumeGain)
                    .file(hashedFilename)
                    .exec(resolve);
            });
        });
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = voiceModule;
