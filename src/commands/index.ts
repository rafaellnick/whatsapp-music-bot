import { PREFIX } from '../config';
import play from './play';
import help from './help';
import video from './video';

export default {
  [`${PREFIX}play`]: play,
  [`${PREFIX}help`]: help,
  [`${PREFIX}video`]: video,
};
