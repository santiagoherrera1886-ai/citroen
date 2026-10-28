import {mkdirSync,writeFileSync} from 'node:fs';
import {buildCampaignScript} from '../lib/campaign-apps-script.mjs';
mkdirSync(new URL('../downloads/',import.meta.url),{recursive:true});
writeFileSync(new URL('../downloads/CitroenSync.gs',import.meta.url),buildCampaignScript(''));
