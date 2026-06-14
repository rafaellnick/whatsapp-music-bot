import { Message } from 'whatsapp-web.js';
import Downloader from '../services/download';
import Searcher from '../services/search';
import text from '../language';
import { LANGUAGE } from '../config';
import createLocalMedia from '../utils/createLocalMedia';
import sendLocalMedia from '../utils/sendLocalMedia';

export default {
  run: async (message: Message, keyword: string): Promise<Message> => {
    const downloader = new Downloader();
    const searcher = new Searcher();
    try {
      const { title, videoId } = await searcher.handle(keyword);
      message.reply(`${text[LANGUAGE].FOUNDED} "${title}"`);

      message.reply(text[LANGUAGE].DOWNLOAD_STARTED);

      const music = await downloader.handle(videoId);

      const media = createLocalMedia(music);
      return sendLocalMedia(message, media);
    } catch (error) {
      console.log(error);
      return message.reply(text[LANGUAGE].ERROR);
    }
  },
  help: text[LANGUAGE].HELP_PLAY,
};
