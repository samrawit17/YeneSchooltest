import packageInfo from '../../package.json';

export const APP_VERSION = packageInfo.version;
export const BUILD_DATE = new Date().toISOString();
