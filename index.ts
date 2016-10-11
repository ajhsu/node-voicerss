var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var mpg321 = require('mpg321');
var progress = require('request-progress');
var request = require('request');

type Codec = 'MP3' | 'WAV' | 'AAC';
type Language = 'zh-cn' | 'zh-hk' | 'zh-tw';

enum VoiceSpeed {
  Slow = -5,
  Normal = 0,
  Fast = 5
}

interface VoiceApiOptions {
  key: string,
  text: string,
  hl: Language,
  speed: VoiceSpeed,
  codec: Codec,
  format: string
}

let config = {
  apiKey: '',
  audioCacheFolderName: '__audiocache__',
  volumeGain: 300
};

const createDirIfNotExist = (dirName: string): boolean => {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
    return true;
  }
  return false;
};

const procedure = {
  createAPIUrl: (params: VoiceApiOptions): string => {
    return `https://api.voicerss.org/?key=${params.key}&src=${params.text}&hl=${params.hl}&r=${params.speed}&c=${params.codec}&f=${params.format}`;
  },
  downloadMp3File: (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cacheDir: string = config.audioCacheFolderName;
      const hashedFilename: string = path.resolve(__dirname, `./${cacheDir}/${md5(url)}.mp3`);
      if (fs.existsSync(hashedFilename)) {
        console.log('[Audio file exists in cache]');
        resolve(hashedFilename);
        return;
      }
      createDirIfNotExist(cacheDir);
      console.log(`[Start to download audio from ${url}]`);
      progress(
        request({
          url,
          method: 'GET'
        }),
        {
          throttle: 500
        }
      )
        .on('end', () => {
          resolve(hashedFilename);
        })
        .pipe(fs.createWriteStream(hashedFilename));
    });
  }
};

const voiceModule = {
  setup: (apiKey: string): boolean => {
    if (apiKey) {
      config.apiKey = apiKey;
      return true;
    }
    return false;
  },
  speak: (text: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const apiUrl = procedure.createAPIUrl({
        key: config.apiKey,
        text: encodeURIComponent(text),
        hl: 'zh-cn',
        speed: VoiceSpeed.Normal,
        codec: 'MP3',
        format: '48khz_16bit_stereo'
      });
      procedure.downloadMp3File(apiUrl)
        .then((hashedFilename: string) => {
          const childProc = mpg321().gain(config.volumeGain)
            .file(hashedFilename)
            .exec(resolve);
        });
    });
  }
};

export default voiceModule;